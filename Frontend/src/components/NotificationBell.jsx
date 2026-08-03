import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { socket } from "../lib/socket";
import {
  deleteAllUserNotifications,
  deleteUserNotification,
  getUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from "../lib/userNotifications";
import "./NotificationBell.css";


const getNotificationLabel = (type) => {
  if (!type) {
    return "Notification";
  }

  return type.replace(/([A-Z])/g, " $1").trim();
};


const formatDate = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
};


export default function NotificationPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

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

  const markRead = async (notification) => {
    if (notification.is_read) {
      return;
    }

    try {
      setActionLoading(true);

      await markUserNotificationRead(
        notification.notification_id
      );

      await loadNotifications();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRelatedDeal = async (notification) => {
    await markRead(notification);

    if (notification.room_code) {
      navigate(`/deal/${notification.room_code}`);
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

  const deleteOne = async (notificationId) => {
    try {
      setActionLoading(true);

      await deleteUserNotification(notificationId);
      await loadNotifications();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteAll = async () => {
    const confirmed = window.confirm(
      "Delete all of your notifications?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);

      await deleteAllUserNotifications();
      await loadNotifications();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="notification-page">
      <section className="notification-page-card">
        <header className="notification-page-header">
          <div>
            <span className="notification-page-eyebrow">
              Account activity
            </span>

            <h1>Notifications</h1>

            <p>
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount === 1 ? "" : "s"
                  }.`
                : "You are all caught up."}
            </p>
          </div>

          <Bell
            className="notification-page-icon"
            size={30}
          />
        </header>

        <div className="notification-page-actions">
          <button
            type="button"
            className="notification-mark-all-button"
            onClick={markAllRead}
            disabled={
              actionLoading || unreadCount === 0
            }
          >
            <CheckCheck size={17} />
            Mark all read
          </button>

          <button
            type="button"
            className="notification-delete-all-button"
            onClick={deleteAll}
            disabled={
              actionLoading
              || notifications.length === 0
            }
          >
            <Trash2 size={17} />
            Delete all
          </button>
        </div>

        {loading && (
          <div className="notification-page-empty">
            Loading notifications…
          </div>
        )}

        {!loading && error && (
          <div className="notification-page-error">
            {error}
          </div>
        )}

        {!loading
          && !error
          && notifications.length === 0 && (
            <div className="notification-page-empty">
              No notifications to show.
            </div>
          )}

        {!loading
          && !error
          && notifications.length > 0 && (
            <div className="notification-page-list">
              {notifications.map((notification) => (
                <article
                  key={notification.notification_id}
                  className={
                    `notification-page-item ${
                      notification.is_read
                        ? ""
                        : "notification-page-item-unread"
                    }`
                  }
                >
                  <button
                    type="button"
                    className="notification-page-content"
                    onClick={() => markRead(notification)}
                  >
                    <div className="notification-page-item-top">
                      <span className="notification-page-type">
                        {getNotificationLabel(
                          notification.notification_type
                        )}
                      </span>

                      <time>
                        {formatDate(
                          notification.created_at
                        )}
                      </time>
                    </div>

                    <h2>{notification.title}</h2>

                    <p>{notification.message}</p>
                  </button>

                  <div className="notification-page-item-actions">
                    {notification.room_code && (
                      <button
                        type="button"
                        className="notification-open-deal-button"
                        onClick={() =>
                          openRelatedDeal(notification)
                        }
                        disabled={actionLoading}
                      >
                        Open deal
                      </button>
                    )}

                    <button
                      type="button"
                      className="notification-delete-button"
                      onClick={() =>
                        deleteOne(
                          notification.notification_id
                        )
                      }
                      disabled={actionLoading}
                      aria-label={
                        `Delete ${notification.title}`
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>
    </main>
  );
}