from flask import Blueprint, request, jsonify
from database import get_db
from socketio_instance import socketio
import traceback
deal_bp = Blueprint("deal", __name__)



@deal_bp.route("/deals/<room_code>/select-role", methods=["POST"])
def select_role(room_code):

    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    role = str(data.get("role", "")).strip().lower()

    if not user_id or not role:
        return jsonify({
            "success": False,
            "message": "User ID and role are required."
        }), 400

    if role not in ["buyer", "seller"]:
        return jsonify({
            "success": False,
            "message": "Role must be Buyer or Seller."
        }), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                room_id,
                created_by,
                invited_user_id,
                status,
                current_step
            FROM room
            WHERE room_code = %s
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        room_id = room[0]
        creator_id = room[1]
        invited_user_id = room[2]
        room_status = room[3]
        current_step = room[4]

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id)
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403

        if room_status not in ["Accepted", "RolesAssigned"]:
            return jsonify({
                "success": False,
                "message": "The invitation must be accepted before selecting roles."
            }), 400

        partner_id = (
            invited_user_id
            if str(user_id) == str(creator_id)
            else creator_id
        )
        # ------------------------------------
        # Check if roles already exist
        # ------------------------------------

        cur.execute("""
            SELECT 1
            FROM buyer
            WHERE room_id = %s
        """, (room_id,))

        buyer_exists = cur.fetchone()

        cur.execute("""
            SELECT 1
            FROM seller
            WHERE room_id = %s
        """, (room_id,))

        seller_exists = cur.fetchone()

        if buyer_exists or seller_exists:
            return jsonify({
                "success": False,
                "message": "Roles have already been selected."
            }), 400

        # ------------------------------------
        # Decide buyer and seller
        # ------------------------------------

        if role == "buyer":
            buyer_id = user_id
            seller_id = partner_id
        else:
            buyer_id = partner_id
            seller_id = user_id


        # ------------------------------------
        # Insert buyer
        # ------------------------------------

        cur.execute("""
            INSERT INTO buyer (
                room_id,
                buyer_id
            )
            VALUES (%s, %s)
        """, (
            room_id,
            buyer_id
        ))


        # ------------------------------------
        # Insert seller
        # ------------------------------------

        cur.execute("""
            INSERT INTO seller (
                room_id,
                seller_id
            )
            VALUES (%s, %s)
        """, (
            room_id,
            seller_id
        ))


        # ------------------------------------
        # Move room to Deal Confirmation
        # ------------------------------------

        cur.execute("""
            UPDATE room
            SET
                status = 'RolesAssigned',
                current_step = 'DealConfirmation'
            WHERE room_id = %s
        """, (room_id,))


        # Save all three database changes together
        conn.commit()


        # ------------------------------------
        # Socket.IO data
        # ------------------------------------

        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "status": "RolesAssigned",
            "current_step": "DealConfirmation",
            "message": "Roles have been selected."
        }


        # Update users currently inside the deal room
        socketio.emit(
            "roles_selected",
            socket_data,
            room=f"deal_{room_code}"
        )


        # Update creator's DealHub
        socketio.emit(
            "room_updated",
            socket_data,
            room=f"user_{creator_id}"
        )


        # Update invited user's DealHub
        socketio.emit(
            "room_updated",
            socket_data,
            room=f"user_{invited_user_id}"
        )


        return jsonify({
            "success": True,
            **socket_data
        }), 200

    except Exception as e:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()

@deal_bp.route("/deals/<room_code>/confirm-amount", methods=["POST"])
def confirm_amount(room_code):

    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    amount = data.get("amount")

    if not user_id or amount is None:
        return jsonify({
            "success": False,
            "message": "User ID and amount are required."
        }), 400

    conn = get_db()
    cur = conn.cursor()

    try:

       # ------------------------------------
        # Validate amount
        # ------------------------------------

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Amount must be a valid number."
            }), 400

        if amount <= 0:
            return jsonify({
                "success": False,
                "message": "Amount must be greater than zero."
            }), 400


        # ------------------------------------
        # Find room
        # ------------------------------------

        cur.execute("""
            SELECT
                room_id,
                created_by,
                invited_user_id,
                status,
                current_step
            FROM room
            WHERE room_code = %s
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        room_id = room[0]
        creator_id = room[1]
        invited_user_id = room[2]
        room_status = room[3]
        current_step = room[4]


        # ------------------------------------
        # Validate room participant
        # ------------------------------------

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id)
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403


        # ------------------------------------
        # Validate current step
        # ------------------------------------

        if current_step != "DealConfirmation":
            return jsonify({
                "success": False,
                "message": "This room is not currently in the deal confirmation step."
            }), 400


        # ------------------------------------
        # Determine user's role
        # ------------------------------------

        cur.execute("""
            SELECT buyer_id
            FROM buyer
            WHERE room_id = %s
        """, (room_id,))

        buyer = cur.fetchone()

        cur.execute("""
            SELECT seller_id
            FROM seller
            WHERE room_id = %s
        """, (room_id,))

        seller = cur.fetchone()

        if not buyer or not seller:
            return jsonify({
                "success": False,
                "message": "Roles have not been selected yet."
            }), 400

        is_buyer = str(buyer[0]) == str(user_id)
        is_seller = str(seller[0]) == str(user_id)

        if not is_buyer and not is_seller:
            return jsonify({
                "success": False,
                "message": "You are not assigned to this deal."
            }), 403


        # ------------------------------------
        # Save agreed amount
        # ------------------------------------

        if is_buyer:

            cur.execute("""
                UPDATE buyer
                SET
                    agreed_amount = %s,
                    ready = TRUE
                WHERE room_id = %s
            """, (
                amount,
                room_id
            ))

        else:

            cur.execute("""
                UPDATE seller
                SET
                    agreed_amount = %s,
                    ready = TRUE
                WHERE room_id = %s
            """, (
                amount,
                room_id
            ))


        conn.commit()


        return jsonify({
            "success": True,
            "role": "buyer" if is_buyer else "seller",
            "amount": amount,
            "message": "Amount saved successfully."
        }), 200

    except Exception as e:

        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cur.close()
        conn.close()