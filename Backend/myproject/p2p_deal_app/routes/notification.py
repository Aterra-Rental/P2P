from flask import (
    Blueprint,
    g,
    jsonify,
)

from database import get_db
from services.auth_required import login_required
from services.notification_service import (
    NOTIFICATION_RETURNING_COLUMNS,
    emit_notifications_changed,
    serialize_notification,
)


notification_bp = Blueprint(
    "notification",
    __name__,
)


@notification_bp.route(
    "/notifications",
    methods=["GET"],
)
@login_required
def get_notifications():
    user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            f"""
            SELECT {NOTIFICATION_RETURNING_COLUMNS}
            FROM user_notifications
            WHERE user_id = %s
              AND deleted_at IS NULL
            ORDER BY
                created_at DESC,
                notification_id DESC
            LIMIT 100
            """,
            (user_id,),
        )

        notifications = [
            serialize_notification(row)
            for row in cursor.fetchall()
        ]

        unread_count = sum(
            1
            for notification in notifications
            if not notification["is_read"]
        )

        return jsonify({
            "success": True,
            "notifications": notifications,
            "unread_count": unread_count,
        }), 200

    except Exception:
        return jsonify({
            "success": False,
            "message": (
                "Unable to load notifications."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()


@notification_bp.route(
    "/notifications/<int:notification_id>/read",
    methods=["PUT"],
)
@login_required
def mark_notification_read(notification_id):
    user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE user_notifications
            SET is_read = TRUE
            WHERE notification_id = %s
              AND user_id = %s
              AND deleted_at IS NULL
            RETURNING notification_id
            """,
            (
                notification_id,
                user_id,
            ),
        )

        updated = cursor.fetchone()

        if not updated:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Notification not found.",
            }), 404

        conn.commit()

        emit_notifications_changed([user_id])

        return jsonify({
            "success": True,
            "notification_id": updated[0],
            "is_read": True,
        }), 200

    except Exception:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Unable to update the notification."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()


@notification_bp.route(
    "/notifications/read-all",
    methods=["PUT"],
)
@login_required
def mark_all_notifications_read():
    user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE user_notifications
            SET is_read = TRUE
            WHERE user_id = %s
              AND is_read = FALSE
              AND deleted_at IS NULL
            """,
            (user_id,),
        )

        updated_count = cursor.rowcount
        conn.commit()

        emit_notifications_changed([user_id])

        return jsonify({
            "success": True,
            "updated_count": updated_count,
        }), 200

    except Exception:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Unable to mark notifications as read."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()


@notification_bp.route(
    "/notifications/<int:notification_id>",
    methods=["DELETE"],
)
@login_required
def delete_notification(notification_id):
    user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE user_notifications
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE notification_id = %s
              AND user_id = %s
              AND deleted_at IS NULL
            RETURNING notification_id
            """,
            (
                notification_id,
                user_id,
            ),
        )

        deleted = cursor.fetchone()

        if not deleted:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Notification not found.",
            }), 404

        conn.commit()

        emit_notifications_changed([user_id])

        return jsonify({
            "success": True,
            "notification_id": deleted[0],
            "message": "Notification deleted.",
        }), 200

    except Exception:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Unable to delete the notification."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()


@notification_bp.route(
    "/notifications",
    methods=["DELETE"],
)
@login_required
def delete_all_notifications():
    user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE user_notifications
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
              AND deleted_at IS NULL
            """,
            (user_id,),
        )

        deleted_count = cursor.rowcount
        conn.commit()

        emit_notifications_changed([user_id])

        return jsonify({
            "success": True,
            "deleted_count": deleted_count,
            "message": "All notifications deleted.",
        }), 200

    except Exception:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Unable to delete notifications."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()