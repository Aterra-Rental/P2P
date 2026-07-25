from flask import Blueprint, request, jsonify
from database import get_db
import random
import string
import traceback

room_bp = Blueprint("room", __name__)
def generate_room_code(length=6):
    characters = string.ascii_uppercase + string.digits
    return "".join(random.choices(characters, k=length))
@room_bp.route("/rooms", methods=["POST"])
def create_room():
    try:
        data = request.get_json()

        created_by = data.get("created_by")

        if not created_by:
            return jsonify({
                "success": False,
                "message": "created_by is required."
            }), 400

        conn = get_db()
        cur = conn.cursor()

        room_code = generate_room_code()

        # Ensure uniqueness
        while True:
            cur.execute(
                "SELECT room_id FROM room WHERE room_code = %s",
                (room_code,)
            )

            if not cur.fetchone():
                break

            room_code = generate_room_code()

        cur.execute("""
            INSERT INTO room
            (room_code, created_by, status)
            VALUES (%s, %s, 'Waiting')
            RETURNING room_id;
        """, (room_code, created_by))

        room_id = cur.fetchone()[0]

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code
        }), 201

    except Exception:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to create room."
        }), 500