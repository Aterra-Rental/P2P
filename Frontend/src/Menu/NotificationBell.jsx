import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Bell, Trash2, X } from "lucide-react";
import { socket } from "../lib/socket";
import {
  deleteUserNotification,
  getUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from "../lib/userNotifications";
import "./NotificationBell.css";
import { Link } from "react-router-dom";


const getNotificationLabel = (type) => {
  if (!type) {
    return "Notification";
  }

  return type.replace(/([A-Z])/g, " $1").trim();
};


export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [justArrived, setJustArrived] = useState(false);
  const [currentTime, setCurrentTime] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      setError("");

      const data = await getUserNotifications();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      loadNotifications();
    }, 0);

    const handleNotificationsChanged = () => {
      loadNotifications();
      setJustArrived(true);

      window.setTimeout(() => {
        setJustArrived(false);
      }, 1200);
    };

    socket.on(
      "notifications_changed",
      handleNotificationsChanged
    );

    return () => {
      window.clearTimeout(initialLoadTimer);

      socket.off(
        "notifications_changed",
        handleNotificationsChanged
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(Date.now());
    };

    const initialTimer = window.setTimeout(
      updateCurrentTime,
      0
    );

    const interval = window.setInterval(
      updateCurrentTime,
      60_000
    );

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

    useEffect(() => {
    const closeOutsideDropdown = (event) => {
      if (
        dropdownRef.current
        && !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      closeOutsideDropdown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOutsideDropdown
      );
    };
  }, []);

  const timeAgo = (iso) => {
    if (!iso || currentTime === null) {
      return "just now";
    }

    const difference = Math.max(
      0,
      currentTime - new Date(iso).getTime()
    );

    const minutes = Math.floor(difference / 60_000);

    if (minutes < 1) {
      return "just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
  };

  const fullDate = (iso) => {
    if (!iso) {
      return "";
    }

    return new Date(iso).toLocaleString();
  };

  const openNotification = async (notification) => {
    setSelected(notification);
    setOpen(false);

    if (notification.is_read) {
      return;
    }

    try {
      setActionLoading(true);

      await markUserNotificationRead(
        notification.notification_id
      );

      setSelected((current) => (
        current
        && current.notification_id
          === notification.notification_id
          ? {
              ...current,
              is_read: true,
            }
          : current
      ));

      await loadNotifications();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      setActionLoading(true);
      await markAllUserNotificationsRead();
      await loadNotifications();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected) {
      return;
    }

    try {
      setActionLoading(true);

      await deleteUserNotification(
        selected.notification_id
      );

      setSelected(null);
      await loadNotifications();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="bell-wrap"
      ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          `bell-btn ${
            justArrived ? "bell-pulse" : ""
          }`
        }
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={
            unreadCount > 0
              ? "bell-icon-active"
              : "bell-icon"
          }
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
            <span>Notifications</span>

            {unreadCount > 0 && (
              <button
                type="button"
                className="bell-mark-all"
                onClick={markAllRead}
                disabled={actionLoading}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="bell-list">
            {loading && (
              <div className="bell-empty">
                Loading notifications…
              </div>
            )}

            {!loading && error && (
              <div className="bell-empty">
                {error}
              </div>
            )}

            {!loading
              && !error
              && notifications.length === 0 && (
                <div className="bell-empty">
                  No notifications yet
                </div>
              )}

            {!loading
              && notifications.map((notification) => (
                <button
                  key={notification.notification_id}
                  type="button"
                  className={
                    `bell-item ${
                      notification.is_read
                        ? ""
                        : "bell-item-unread"
                    }`
                  }
                  onClick={() =>
                    openNotification(notification)
                  }
                >
                  <div className="bell-item-row">
                    {!notification.is_read && (
                      <span className="bell-dot" />
                    )}

                    <div className="bell-item-body">
                      <div className="bell-item-top">
                        <span className="bell-item-title">
                          {notification.title}
                        </span>

                        <span className="bell-item-time">
                          {timeAgo(
                            notification.created_at
                          )}
                        </span>
                      </div>

                      <p className="bell-item-message">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
                    </div>

          <div className="bell-dropdown-footer">
            <Link
              to="/notifications"
              className="bell-view-all-link"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="bell-modal-overlay"
          onClick={() => setSelected(null)}
        >
          <div
            className="bell-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="bell-modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="bell-modal-header">
              <span className="bell-modal-eyebrow">
                {getNotificationLabel(
                  selected.notification_type
                )}
              </span>

              <h2 className="bell-modal-title">
                {selected.title}
              </h2>

              <span className="bell-modal-date">
                {fullDate(selected.created_at)}
              </span>
            </div>

            <div className="bell-modal-body">
              <p>{selected.message}</p>
            </div>

            <div className="bell-modal-actions">
              <button
                type="button"
                className="bell-delete-button"
                onClick={deleteSelected}
                disabled={actionLoading}
              >
                <Trash2 size={16} />
                Delete notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}