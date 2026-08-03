import traceback

from flask import Blueprint, g, jsonify, request

from database import get_db
from services.auth_required import login_required
from socketio_instance import socketio


message_bp = Blueprint("message", __name__)

MAX_MESSAGE_LENGTH = 1000


def get_member_room(cursor, room_code, user_id):
    cursor.execute(
        """
        SELECT
            room_id,
            created_by,
            invited_user_id,
            status,
            current_step
        FROM room
        WHERE room_code = %s
          AND (
              created_by = %s
              OR invited_user_id = %s
          )
        """,
        (
            room_code,
            user_id,
            user_id,
        ),
    )

    return cursor.fetchone()


def serialize_message(row):
    (
        message_id,
        sender_id,
        message_text,
        created_at,
    ) = row

    return {
        "message_id": message_id,
        "sender_id": sender_id,
        "message": message_text,
        "created_at": (
            created_at.isoformat()
            if created_at
            else None
        ),
    }


def announce_message_change(
    room_id,
    room_code,
    message_id,
    participant_ids,
):
    event_data = {
        "room_id": room_id,
        "room_code": room_code,
        "message_id": message_id,
        "resource": "messages",
    }

    try:
        socketio.emit(
            "message_created",
            event_data,
            room=f"deal_{room_code}",
        )

        for participant_id in participant_ids:
            if participant_id is None:
                continue

            socketio.emit(
                "user_data_changed",
                event_data,
                room=f"user_{participant_id}",
            )
    except Exception:
        # The message is already stored in PostgreSQL.
        # A Socket.IO failure must not make the HTTP request fail.
        traceback.print_exc()


@message_bp.route(
    "/messages/<room_code>",
    methods=["GET"],
)
@login_required
def get_messages(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        room = get_member_room(
            cursor,
            room_code,
            authenticated_user_id,
        )

        if not room:
            return jsonify({
                "success": False,
                "message": (
                    "Room was not found or you are not "
                    "a participant."
                ),
            }), 404

        room_id = room[0]

        cursor.execute(
            """
            SELECT
                message_id,
                sender_id,
                message,
                created_at
            FROM (
                SELECT
                    message_id,
                    sender_id,
                    message,
                    created_at
                FROM room_messages
                WHERE room_id = %s
                ORDER BY message_id DESC
                LIMIT 200
            ) recent_messages
            ORDER BY message_id ASC
            """,
            (room_id,),
        )

        messages = [
            serialize_message(row)
            for row in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code,
            "messages": messages,
        }), 200

    except Exception as error:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": "Unable to load chat messages.",
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()


@message_bp.route(
    "/messages/<room_code>",
    methods=["POST"],
)
@login_required
def create_message(room_code):
    authenticated_user_id = g.current_user_id
    data = request.get_json(silent=True) or {}

    message_text = str(
        data.get("message", "")
    ).strip()

    if not message_text:
        return jsonify({
            "success": False,
            "message": "Message cannot be empty.",
        }), 400

    if len(message_text) > MAX_MESSAGE_LENGTH:
        return jsonify({
            "success": False,
            "message": (
                f"Message cannot exceed "
                f"{MAX_MESSAGE_LENGTH} characters."
            ),
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        room = get_member_room(
            cursor,
            room_code,
            authenticated_user_id,
        )

        if not room:
            return jsonify({
                "success": False,
                "message": (
                    "Room was not found or you are not "
                    "a participant."
                ),
            }), 404

        (
            room_id,
            created_by,
            invited_user_id,
            room_status,
            current_step,
        ) = room

        if (
            room_status in {
                "Waiting",
                "Rejected",
                "Completed",
                "Cancelled",
            }
            or current_step in {
                "Completed",
                "Cancelled",
            }
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Messages cannot be sent in the "
                    "current room state."
                ),
            }), 409

        cursor.execute(
            """
            INSERT INTO room_messages (
                room_id,
                sender_id,
                message
            )
            VALUES (%s, %s, %s)
            RETURNING
                message_id,
                sender_id,
                message,
                created_at
            """,
            (
                room_id,
                authenticated_user_id,
                message_text,
            ),
        )

        stored_message = serialize_message(
            cursor.fetchone()
        )

        conn.commit()

        announce_message_change(
            room_id,
            room_code,
            stored_message["message_id"],
            {
                created_by,
                invited_user_id,
            },
        )

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code,
            "message": stored_message,
        }), 201

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": "Unable to send chat message.",
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()