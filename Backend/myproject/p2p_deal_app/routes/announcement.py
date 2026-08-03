from flask import Blueprint, jsonify, request

from database import get_db
from services.admin_auth_token import (
    AdminAuthenticationError,
    decode_admin_access_token,
)
from services.notification_service import (
    create_announcement_notifications,
    emit_notifications_changed,
)
from socketio_instance import socketio


announcement_bp = Blueprint(
    "announcement",
    __name__,
)


def _authenticate_admin():
    authorization = request.headers.get(
        "Authorization",
        "",
    )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token.strip():
        return None, (
            jsonify({
                "success": False,
                "message": (
                    "Admin Authorization Bearer token "
                    "is required."
                ),
            }),
            401,
        )

    try:
        admin = decode_admin_access_token(
            token.strip()
        )
    except AdminAuthenticationError as error:
        return None, (
            jsonify({
                "success": False,
                "message": str(error),
            }),
            401,
        )

    return admin, None


def _serialize_announcement(row):
    return {
        "announcement_id": row[0],
        "title": row[1],
        "message": row[2],
        "created_by": row[3],
        "is_active": row[4],
        "created_at": (
            row[5].isoformat()
            if row[5]
            else None
        ),
        "updated_at": (
            row[6].isoformat()
            if row[6]
            else None
        ),
    }


@announcement_bp.route(
    "/api/admin/announcements",
    methods=["POST"],
)
def create_announcement():
    admin, auth_error = _authenticate_admin()

    if auth_error:
        return auth_error

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body must be valid JSON.",
        }), 400

    title = str(data.get("title") or "").strip()
    message = str(data.get("message") or "").strip()

    if not title or not message:
        return jsonify({
            "success": False,
            "message": "Title and message are required.",
        }), 400

    if len(title) > 255:
        return jsonify({
            "success": False,
            "message": (
                "Announcement title must be "
                "255 characters or fewer."
            ),
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO announcements (
                title,
                message,
                created_by
            )
            VALUES (%s, %s, %s)
            RETURNING
                announcement_id,
                title,
                message,
                created_by,
                is_active,
                created_at,
                updated_at
            """,
            (
                title,
                message,
                admin["admin_id"],
            ),
        )

        announcement = _serialize_announcement(
            cursor.fetchone()
        )

        personal_notifications = (
            create_announcement_notifications(
                cursor,
                announcement_id=(
                    announcement["announcement_id"]
                ),
                title=announcement["title"],
                message=announcement["message"],
                created_at=(
                    announcement["created_at"]
                ),
            )
        )

        affected_user_ids = [
            notification["user_id"]
            for notification in personal_notifications
        ]

        conn.commit()

        emit_notifications_changed(
            affected_user_ids
        )

        socketio.emit(
            "new_announcement",
            announcement,
        )

        return jsonify(announcement), 201

    except Exception:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Unable to create the announcement."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()


@announcement_bp.route(
    "/api/admin/announcements",
    methods=["GET"],
)
def list_announcements_admin():
    _, auth_error = _authenticate_admin()

    if auth_error:
        return auth_error

    return _list_announcements(
        include_inactive=True
    )


@announcement_bp.route(
    "/api/announcements",
    methods=["GET"],
)
def list_announcements_user():
    return _list_announcements(
        include_inactive=False
    )


def _list_announcements(include_inactive):
    conn = get_db()
    cursor = conn.cursor()

    try:
        query = """
            SELECT
                announcement_id,
                title,
                message,
                created_by,
                is_active,
                created_at,
                updated_at
            FROM announcements
        """

        if not include_inactive:
            query += " WHERE is_active = TRUE"

        query += (
            " ORDER BY created_at DESC, "
            "announcement_id DESC"
        )

        cursor.execute(query)

        announcements = [
            _serialize_announcement(row)
            for row in cursor.fetchall()
        ]

        return jsonify(announcements), 200

    except Exception:
        return jsonify({
            "success": False,
            "message": (
                "Unable to load announcements."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()