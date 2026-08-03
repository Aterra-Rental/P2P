from flask import Blueprint, request, jsonify
from database import get_db
from socketio_instance import socketio

announcement_bp = Blueprint("announcement", __name__)


@announcement_bp.route("/api/admin/announcements", methods=["POST"])
def create_announcement():
    data = request.get_json()

    title = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    created_by = data.get("created_by")  # admin user_id, optional

    if not title or not message:
        return jsonify({"message": "Title and message are required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO announcements (title, message, created_by)
            VALUES (%s, %s, %s)
            RETURNING announcement_id, created_at;
            """,
            (title, message, created_by),
        )

        announcement_id, created_at = cursor.fetchone()
        conn.commit()

        payload = {
            "announcement_id": announcement_id,
            "title": title,
            "message": message,
            "created_at": created_at.isoformat(),
        }

        # broadcast to every connected client (users' bells)
        socketio.emit("new_announcement", payload)

        return jsonify(payload), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@announcement_bp.route("/api/admin/announcements", methods=["GET"])
def list_announcements_admin():
    return _list_announcements()


@announcement_bp.route("/api/announcements", methods=["GET"])
def list_announcements_user():
    return _list_announcements()


def _list_announcements():
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT announcement_id, title, message, created_by, created_at
            FROM announcements
            ORDER BY created_at DESC;
            """
        )

        rows = cursor.fetchall()

        result = [
            {
                "announcement_id": r[0],
                "title": r[1],
                "message": r[2],
                "created_by": r[3],
                "created_at": r[4].isoformat() if r[4] else None,
            }
            for r in rows
        ]

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()