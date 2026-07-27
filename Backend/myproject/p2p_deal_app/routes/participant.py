from flask import Blueprint, request, jsonify
from database import get_db

participant_bp = Blueprint("participant", __name__)


# ======================================================
# SELECT BUYER / SELLER ROLE
# ======================================================
@participant_bp.route("/participant/select-role", methods=["POST"])
def select_role():

    data = request.json

    required_fields = [
        "room_code",
        "user_id",
        "selected_role"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "success": False,
                "message": f"Missing field: {field}"
            }), 400

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("""
            SELECT
                room_id,
                created_by,
                invited_user_id,
                agreed_price,
                status
            FROM room
            WHERE room_code = %s
        """, (data["room_code"],))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        room_id = room[0]
        created_by = room[1]
        invited_user_id = room[2]
        agreed_price = room[3]
        status = room[4]
        if status == "RolesAssigned":
            return jsonify({
            "success": False,
            "message": "Roles have already been assigned."
            }), 400

        if status != "Accepted":
            return jsonify({
                "success": False,
                "message": f"Cannot select roles while room status is '{status}'."
            }), 400

        if int(data["user_id"]) != invited_user_id:
            return jsonify({
                "success": False,
                "message": "Only the invited user can select roles."
            }), 403

        if data["selected_role"] not in ["Buyer", "Seller"]:
            return jsonify({
                "success": False,
                "message": "Invalid role selected."
            }), 400
        if data["selected_role"] == "Buyer":

            buyer_id = invited_user_id
            seller_id = created_by

        else:

            buyer_id = created_by
            seller_id = invited_user_id


        # Prevent assigning roles twice
        cur.execute("""
            SELECT room_id
            FROM buyer
            WHERE room_id = %s
        """, (room_id,))

        if cur.fetchone():
            return jsonify({
                "success": False,
                "message": "Roles have already been assigned."
            }), 400


        # Create Buyer
        cur.execute("""
            INSERT INTO buyer
            (
                room_id,
                buyer_id,
                agreed_amount
            )
            VALUES
            (%s,%s,%s)
        """, (
            room_id,
            buyer_id,
            agreed_price
        ))


        # Create Seller
        cur.execute("""
            INSERT INTO seller
            (
                room_id,
                seller_id,
                agreed_amount
            )
            VALUES
            (%s,%s,%s)
        """, (
            room_id,
            seller_id,
            agreed_price
        ))


        # Move room to next stage
        cur.execute("""
            UPDATE room
            SET status = 'RolesAssigned'
            WHERE room_id = %s
        """, (room_id,))


        conn.commit()

        return jsonify({
            "success": True,
            "message": "Roles assigned successfully.",
            "buyer_id": buyer_id,
            "seller_id": seller_id
        }), 200
    except Exception as e:

        conn.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cur.close()
        conn.close()