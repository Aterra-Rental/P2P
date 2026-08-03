import { useCallback, useEffect, useState } from "react";

import AdminLayout from "../../../Components/Layout/AdminLayout";
import { socket } from "../../../../lib/socket";
import { API_URL } from "../../../../lib/api";

import "./AdminAnnouncement.css";

const TEASER_LENGTH = 100;

const AdminAnnouncement = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/announcements`);

      if (!res.ok) {
        throw new Error("Failed to load announcement history");
      }

      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch announcement history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Live-refresh history if another admin sends a broadcast
  useEffect(() => {
    const handleAnnouncementCreated = () => {
      fetchHistory();
    };

    socket.on("announcement_created", handleAnnouncementCreated);

    return () => {
      socket.off("announcement_created", handleAnnouncementCreated);
    };
  }, [fetchHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSendError("");

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setSendError("Title and message are both required.");
      return;
    }

    setSending(true);

    try {
      const res = await fetch(`${API_URL}/admin/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          message: trimmedMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send announcement.");
      }

      setHistory((prev) => [data, ...prev]);
      setTitle("");
      setMessage("");
    } catch (err) {
      console.error("Failed to send announcement:", err);
      setSendError(err.message || "Failed to send announcement.");
    } finally {
      setSending(false);
    }
  };

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <AdminLayout>
      <div className="announcement-page">
        <div className="announcement-page-header">
          <h1>Announcements</h1>
          <p>Broadcast a message to every user's notification tab.</p>
        </div>

        <div className="announcement-split">
          <form className="announcement-compose-card" onSubmit={handleSend}>
            <label className="announcement-field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled maintenance tonight"
                maxLength={255}
              />
            </label>

            <label className="announcement-field">
              <span>Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the announcement..."
                rows={4}
              />
            </label>

            {sendError && (
              <div className="announcement-error-banner">{sendError}</div>
            )}

            <button
              type="submit"
              className="announcement-send-btn"
              disabled={sending}
            >
              {sending ? "Sending..." : "Broadcast"}
            </button>
          </form>

          <div className="announcement-history-card">
            <h2>History</h2>

            {historyLoading && (
              <div className="announcement-history-empty">Loading...</div>
            )}

            {!historyLoading && history.length === 0 && (
              <div className="announcement-history-empty">
                No announcements sent yet.
              </div>
            )}

            {!historyLoading &&
              history.map((item) => {
                const isExpanded = expandedId === item.id;
                const isLong =
                  item.message && item.message.length > TEASER_LENGTH;
                const displayMessage = isExpanded
                  ? item.message
                  : isLong
                  ? item.message.slice(0, TEASER_LENGTH).trim() + "..."
                  : item.message;

                return (
                  <div
                    key={item.id}
                    className="announcement-history-item"
                    onClick={() => isLong && toggleExpanded(item.id)}
                    style={{ cursor: isLong ? "pointer" : "default" }}
                  >
                    <div className="announcement-history-item-header">
                      <span className="announcement-history-title">
                        {item.title}
                      </span>
                      <span className="announcement-history-date">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="announcement-history-message">
                      {displayMessage}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        className="announcement-history-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(item.id);
                        }}
                      >
                        {isExpanded ? "Show less" : "Read more"}
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
