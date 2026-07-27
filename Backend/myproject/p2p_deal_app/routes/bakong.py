from flask import Blueprint, request, jsonify
from database import get_db
from services.bakong_service import generate_qr, BakongServiceError

bakong_bp = Blueprint("bakong", __name__)


@bakong_bp.route("/bakong/generate", methods=["POST"])
def generate_bakong_qr():
    data = request.get_json()

    room_id = data.get("room_id")

    if not room_id:
        return jsonify({
            "success": False,
            "message": "room_id is required"
        }), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        # Get room information
        cur.execute("""
            SELECT
                room_id,
                room_code,
                agreed_price,
                item_name
            FROM room
            WHERE room_id = %s
        """, (room_id,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found"
            }), 404

        room_id, room_code, agreed_price, item_name = room

        # Generate QR
        result = generate_qr(
            amount=agreed_price,
            room_code=room_code,
            description=item_name or room_code
        )

        # Save Bakong transaction ID (MD5)
        cur.execute("""
            UPDATE room
            SET bakong_transaction_id = %s
            WHERE room_id = %s
        """, (
            result["md5"],
            room_id
        ))

        conn.commit()

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code,
            "amount": float(agreed_price),
            "qr": result["qr"],
            "md5": result["md5"]
        })

    except BakongServiceError as e:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()