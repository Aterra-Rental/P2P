import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AdminLayout from "../../../Components/Layout/AdminLayout";
import { API_URL } from "../../../../lib/api";
import { socket } from "../../../../lib/socket";

import "./AdminAnnouncement.css";


const TEASER_LENGTH = 100;


const getAdminToken = () => {
  try {
    const admin = JSON.parse(
      localStorage.getItem("admin")
    );

    return admin?.token || "";
  } catch {
    return "";
  }
};


const normalizeAnnouncement = (item) => ({
  id: item.announcement_id,
  title: item.title,
  message: item.message,
  createdBy: item.created_by,
  isActive: item.is_active,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});


const AdminAnnouncement = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] =
    useState(true);
  const [historyError, setHistoryError] =
    useState("");
  const [expandedId, setExpandedId] =
    useState(null);

  const fetchHistory = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      setHistoryError(
        "Your admin session is missing. Please log in again."
      );
      setHistoryLoading(false);
      return;
    }

    try {
      setHistoryError("");

      const response = await fetch(
        `${API_URL}/admin/announcements`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load announcement history."
        );
      }

      setHistory(
        Array.isArray(data)
          ? data.map(normalizeAnnouncement)
          : []
      );
    } catch (error) {
      console.error(
        "Failed to fetch announcement history:",
        error
      );

      setHistoryError(
        error.message ||
          "Failed to load announcement history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
  const initialLoadTimer = window.setTimeout(
    () => {
      fetchHistory();
    },
    0
  );

  return () => {
    window.clearTimeout(initialLoadTimer);
  };
}, [fetchHistory]);

  useEffect(() => {
    const handleNewAnnouncement = (payload) => {
      const announcement =
        normalizeAnnouncement(payload);

      setHistory((current) => [
        announcement,
        ...current.filter(
          (item) => item.id !== announcement.id
        ),
      ]);
    };

    socket.on(
      "new_announcement",
      handleNewAnnouncement
    );

    return () => {
      socket.off(
        "new_announcement",
        handleNewAnnouncement
      );
    };
  }, []);

  const handleSend = async (event) => {
    event.preventDefault();
    setSendError("");

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    const token = getAdminToken();

    if (!trimmedTitle || !trimmedMessage) {
      setSendError(
        "Title and message are both required."
      );
      return;
    }

    if (!token) {
      setSendError(
        "Your admin session is missing. Please log in again."
      );
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        `${API_URL}/admin/announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: trimmedTitle,
            message: trimmedMessage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to send announcement."
        );
      }

      const announcement =
        normalizeAnnouncement(data);

      setHistory((current) => [
        announcement,
        ...current.filter(
          (item) => item.id !== announcement.id
        ),
      ]);

      setTitle("");
      setMessage("");
    } catch (error) {
      console.error(
        "Failed to send announcement:",
        error
      );

      setSendError(
        error.message ||
          "Failed to send announcement."
      );
    } finally {
      setSending(false);
    }
  };

  const toggleExpanded = (id) => {
    setExpandedId((current) =>
      current === id ? null : id
    );
  };

  return (
    <AdminLayout>
      <div className="announcement-page">
        <div className="announcement-page-header">
          <h1>Announcements</h1>
          <p>
            Broadcast a message to every user&apos;s
            notification tab.
          </p>
        </div>

        <div className="announcement-split">
          <form
            className="announcement-compose-card"
            onSubmit={handleSend}
          >
            <label className="announcement-field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. Scheduled maintenance tonight"
                maxLength={255}
              />
            </label>

            <label className="announcement-field">
              <span>Message</span>
              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Write the announcement..."
                rows={4}
              />
            </label>

            {sendError && (
              <div className="announcement-error-banner">
                {sendError}
              </div>
            )}

            <button
              type="submit"
              className="announcement-send-btn"
              disabled={sending}
            >
              {sending
                ? "Sending..."
                : "Broadcast"}
            </button>
          </form>

          <div className="announcement-history-card">
            <h2>History</h2>

            {historyLoading && (
              <div className="announcement-history-empty">
                Loading...
              </div>
            )}

            {!historyLoading && historyError && (
              <div className="announcement-error-banner">
                {historyError}
              </div>
            )}

            {!historyLoading &&
              !historyError &&
              history.length === 0 && (
                <div className="announcement-history-empty">
                  No announcements sent yet.
                </div>
              )}

            {!historyLoading &&
              !historyError &&
              history.map((item) => {
                const isExpanded =
                  expandedId === item.id;
                const isLong =
                  item.message &&
                  item.message.length >
                    TEASER_LENGTH;
                const displayMessage =
                  isExpanded || !isLong
                    ? item.message
                    : `${item.message
                        .slice(
                          0,
                          TEASER_LENGTH
                        )
                        .trim()}...`;

                return (
                  <div
                    key={item.id}
                    className="announcement-history-item"
                    onClick={() =>
                      isLong &&
                      toggleExpanded(item.id)
                    }
                    style={{
                      cursor: isLong
                        ? "pointer"
                        : "default",
                    }}
                  >
                    <div className="announcement-history-item-header">
                      <span className="announcement-history-title">
                        {item.title}
                      </span>

                      <span className="announcement-history-date">
                        {item.createdAt
                          ? new Date(
                              item.createdAt
                            ).toLocaleString()
                          : ""}
                      </span>
                    </div>

                    <p className="announcement-history-message">
                      {displayMessage}
                    </p>

                    {isLong && (
                      <button
                        type="button"
                        className="announcement-history-toggle"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(item.id);
                        }}
                      >
                        {isExpanded
                          ? "Show less"
                          : "Read more"}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnnouncement;