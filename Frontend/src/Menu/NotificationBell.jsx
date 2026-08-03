import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { socket } from "../lib/socket";
import { API_URL } from "../lib/api";
import "./NotificationBell.css";

function getUserId() {
  return localStorage.getItem("user_id") || "guest";
}

function getReadKey() {
  return `read_announcement_ids_${getUserId()}`;
}

function loadReadIds() {
  try {
    const raw = localStorage.getItem(getReadKey());
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(idsSet) {
  try {
    localStorage.setItem(getReadKey(), JSON.stringify([...idsSet]));
  } catch (err) {
    console.error("Failed to save read announcement ids", err);
  }
}

export default function NotificationBell() {
  const [announcements, setAnnouncements] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [justArrived, setJustArrived] = useState(false);
  const [currentTime, setCurrentTime] = useState(null);
  const [selected, setSelected] = useState(null);
  const dropdownRef = useRef(null);

  const unreadCount = announcements.filter((a) => !a.read).length;

  // Load history from the database, then apply persisted read state
  useEffect(() => {
    fetch(`${API_URL}/announcements`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const readIds = loadReadIds();
        const withReadState = data.map((a) => ({
          id: a.announcement_id,
          title: a.title,
          message: a.message,
          created_at: a.created_at,
          read: readIds.has(a.announcement_id),
        }));
        setAnnouncements(withReadState);
      })
      .catch((err) => console.error("Failed to load announcements", err))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(Date.now());
    };

    const initialTimer = window.setTimeout(updateCurrentTime, 0);

    const interval = window.setInterval(updateCurrentTime, 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  // Live push when admin posts a new one
  useEffect(() => {
    function handleNew(payload) {
      setAnnouncements((prev) => [
        {
          id: payload.announcement_id,
          title: payload.title,
          message: payload.message,
          created_at: payload.created_at,
          read: false,
        },
        ...prev,
      ]);
      setJustArrived(true);
      setTimeout(() => setJustArrived(false), 1200);
    }
    socket.on("new_announcement", handleNew);
    return () => socket.off("new_announcement", handleNew);
  }, []);

  // Close modal on Escape (dropdown is untouched by this)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") setSelected(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const markAsRead = (id) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a)),
    );
    const readIds = loadReadIds();
    readIds.add(id);
    saveReadIds(readIds);
  };

  const markAllRead = () => {
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
    const readIds = loadReadIds();
    announcements.forEach((a) => readIds.add(a.id));
    saveReadIds(readIds);
  };

  // Opens the detail modal only — dropdown stays exactly as it is,
  // and only the bell button itself toggles it open/closed
  const openAnnouncement = (a) => {
    markAsRead(a.id);
    setSelected(a);
  };

  const timeAgo = (iso) => {
  if (!iso) return "";
  if (currentTime === null) return "just now";
  const diff =
    currentTime - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const fullDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="bell-wrap" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`bell-btn ${justArrived ? "bell-pulse" : ""}`}
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={unreadCount > 0 ? "bell-icon-active" : "bell-icon"}
        />
        {unreadCount > 0 && (
          <span className="bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="bell-dropdown">
          <div className="bell-dropdown-header">
            <span>Announcements</span>
            {unreadCount > 0 && (
              <button className="bell-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="bell-list">
            {loading && <div className="bell-empty">Loading…</div>}

            {!loading && announcements.length === 0 && (
              <div className="bell-empty">No announcements yet</div>
            )}

            {!loading &&
              announcements.map((a) => (
                <button
                  key={a.id}
                  className={`bell-item ${a.read ? "" : "bell-item-unread"}`}
                  onClick={() => openAnnouncement(a)}
                >
                  <div className="bell-item-row">
                    {!a.read && <span className="bell-dot" />}
                    <div className="bell-item-body">
                      <div className="bell-item-top">
                        <span className="bell-item-title">{a.title}</span>
                        <span className="bell-item-time">
                          {timeAgo(a.created_at)}
                        </span>
                      </div>
                      <p className="bell-item-message">{a.message}</p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="bell-modal-overlay" onClick={() => setSelected(null)}>
          <div className="bell-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="bell-modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="bell-modal-header">
              <span className="bell-modal-eyebrow">Announcement</span>
              <h2 className="bell-modal-title">{selected.title}</h2>
              <span className="bell-modal-date">
                {fullDate(selected.created_at)}
              </span>
            </div>

            <div className="bell-modal-body">
              <p>{selected.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
