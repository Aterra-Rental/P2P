from flask import Blueprint, request, jsonify
from database import get_db
from socketio_instance import socketio
import traceback
deal_bp = Blueprint("deal", __name__)



# ======================================================
# GET CURRENT ROLE SELECTION
# ======================================================
@deal_bp.route("/deals/<room_code>/roles", methods=["GET"])
def get_deal_roles(room_code):

    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "message": "User ID is required."
        }), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                r.room_id,
                r.created_by,
                r.invited_user_id,
                r.status,
                r.current_step,
                b.buyer_id,
                COALESCE(b.ready, FALSE),
                s.seller_id,
                COALESCE(s.ready, FALSE)
            FROM room r
            LEFT JOIN buyer b
                ON b.room_id = r.room_id
            LEFT JOIN seller s
                ON s.room_id = r.room_id
            WHERE r.room_code = %s
        """, (room_code,))

        row = cur.fetchone()

        if not row:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        (
            room_id,
            creator_id,
            invited_user_id,
            status,
            current_step,
            buyer_id,
            buyer_ready,
            seller_id,
            seller_ready
        ) = row

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id)
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403

        my_role = None
        my_ready = False

        if buyer_id and str(user_id) == str(buyer_id):
            my_role = "buyer"
            my_ready = bool(buyer_ready)

        elif seller_id and str(user_id) == str(seller_id):
            my_role = "seller"
            my_ready = bool(seller_ready)

        return jsonify({
            "success": True,
            "roles_selected": bool(buyer_id and seller_id),
            "room_id": room_id,
            "room_code": room_code,
            "status": status,
            "current_step": current_step,
            "buyer_id": buyer_id,
            "buyer_ready": bool(buyer_ready),
            "seller_id": seller_id,
            "seller_ready": bool(seller_ready),
            "my_role": my_role,
            "my_ready": my_ready
        }), 200

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


# ======================================================
# SELECT BUYER / SELLER
# First successful request wins
# ======================================================
@deal_bp.route("/deals/<room_code>/select-role", methods=["POST"])
def select_role(room_code):

    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    role = str(data.get("role", "")).strip().lower()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "User ID is required."
        }), 400

    if role not in ["buyer", "seller"]:
        return jsonify({
            "success": False,
            "message": "Role must be Buyer or Seller."
        }), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        # Lock this room until the transaction finishes.
        # This prevents two users from choosing simultaneously.
        cur.execute("""
            SELECT
                room_id,
                created_by,
                invited_user_id,
                status,
                current_step
            FROM room
            WHERE room_code = %s
            FOR UPDATE
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        (
            room_id,
            creator_id,
            invited_user_id,
            room_status,
            current_step
        ) = room

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id)
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403
        if room_status != "Accepted":
              return jsonify({
                "success": False,
                "message": "This room is not waiting for role confirmation."
            }), 400

        if current_step != "RoleSelection":
            return jsonify({
                "success": False,
                "message": "Role confirmation has already finished."
            }), 400
        if room_status != "Accepted":
            return jsonify({
                "success": False,
                "message": "The room is not available for role selection."
            }), 400

        if current_step not in [None, "RoleSelection"]:
            return jsonify({
                "success": False,
                "message": "Role selection has already finished."
            }), 400

        cur.execute("""
            SELECT buyer_id
            FROM buyer
            WHERE room_id = %s
        """, (room_id,))

        buyer_exists = cur.fetchone()

        cur.execute("""
            SELECT seller_id
            FROM seller
            WHERE room_id = %s
        """, (room_id,))

        seller_exists = cur.fetchone()

        if buyer_exists or seller_exists:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": (
                    "Your partner selected first. "
                    "Please review the proposed roles."
                )
            }), 409

        partner_id = (
            invited_user_id
            if str(user_id) == str(creator_id)
            else creator_id
        )

        if role == "buyer":
            buyer_id = int(user_id)
            seller_id = int(partner_id)
        else:
            buyer_id = int(partner_id)
            seller_id = int(user_id)

        cur.execute("""
    INSERT INTO buyer (
        room_id,
        buyer_id,
        agreed_amount,
        ready,
        amount_confirmed
    )
    VALUES (%s, %s, NULL, FALSE, FALSE)
""", (
    room_id,
    buyer_id
))

        cur.execute("""
    INSERT INTO seller (
        room_id,
        seller_id,
        agreed_amount,
        ready,
        amount_confirmed
    )
    VALUES (%s, %s, NULL, FALSE, FALSE)
""", (
    room_id,
    seller_id
))

        # Stay in RoleSelection until both users confirm.
        cur.execute("""
            UPDATE room
            SET current_step = 'RoleSelection'
            WHERE room_id = %s
        """, (room_id,))

        conn.commit()

        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "buyer_id": buyer_id,
            "buyer_ready": False,
            "seller_id": seller_id,
            "seller_ready": False,
            "status": "Accepted",
            "current_step": "RoleSelection",
            "message": "Roles proposed. Both users must confirm."
        }

        socketio.emit(
        "roles_selected",
        socket_data,
        room=f"deal_{room_code}"
)

        socketio.emit(
        "room_updated",
        socket_data,
        room=f"deal_{room_code}"
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


# ======================================================
# CONFIRM CURRENT USER'S ROLE
# ======================================================
@deal_bp.route("/deals/<room_code>/confirm-role", methods=["POST"])
def confirm_role(room_code):

    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "message": "User ID is required."
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
            FOR UPDATE
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        (
            room_id,
            creator_id,
            invited_user_id,
            room_status,
            current_step
        ) = room

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id)
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403

        cur.execute("""
            SELECT buyer_id, COALESCE(ready, FALSE)
            FROM buyer
            WHERE room_id = %s
        """, (room_id,))

        buyer = cur.fetchone()

        cur.execute("""
            SELECT seller_id, COALESCE(ready, FALSE)
            FROM seller
            WHERE room_id = %s
        """, (room_id,))

        seller = cur.fetchone()

        if not buyer or not seller:
            return jsonify({
                "success": False,
                "message": "Roles have not been selected."
            }), 400

        buyer_id, buyer_ready = buyer
        seller_id, seller_ready = seller

        if str(user_id) == str(buyer_id):
            cur.execute("""
                UPDATE buyer
                SET ready = TRUE
                WHERE room_id = %s
            """, (room_id,))

            buyer_ready = True
            my_role = "buyer"

        elif str(user_id) == str(seller_id):
            cur.execute("""
                UPDATE seller
                SET ready = TRUE
                WHERE room_id = %s
            """, (room_id,))

            seller_ready = True
            my_role = "seller"

        else:
            return jsonify({
                "success": False,
                "message": "You do not have a role in this deal."
            }), 403

        both_confirmed = bool(
            buyer_ready and seller_ready
        )

        if both_confirmed:
            cur.execute("""
                UPDATE room
                SET
                    status = 'RolesAssigned',
                    current_step = 'DealConfirmation'
                WHERE room_id = %s
            """, (room_id,))

        conn.commit()

        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "buyer_id": buyer_id,
            "buyer_ready": bool(buyer_ready),
            "seller_id": seller_id,
            "seller_ready": bool(seller_ready),
            "status": (
                "RolesAssigned"
                if both_confirmed
                else room_status
            ),
            "current_step": (
                "DealConfirmation"
                if both_confirmed
                else "RoleSelection"
            )
        }

        if both_confirmed:
            socket_data["message"] = (
        "Both users confirmed their roles."
        )

            socketio.emit(
                "roles_confirmed",
                socket_data,
                room=f"deal_{room_code}"
            )

        else:
            socket_data["message"] = (
                f"The {my_role} confirmed their role."
            )

            socketio.emit(
                "role_confirmation_updated",
                socket_data,
                room=f"deal_{room_code}"
            )


        # Always refresh the DealWorkspace for both users.
        socketio.emit(
            "room_updated",
            socket_data,
            room=f"deal_{room_code}"
        )

        return jsonify({
            "success": True,
            "both_confirmed": both_confirmed,
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


# ======================================================
# DISAGREE AND CHOOSE ROLES AGAIN
# ======================================================
@deal_bp.route("/deals/<room_code>/reset-roles", methods=["POST"])
def reset_roles(room_code):

    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "message": "User ID is required."
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
            FOR UPDATE
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        (
            room_id,
            creator_id,
            invited_user_id,
            room_status,
            current_step
        ) = room

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id)
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403

        if current_step != "RoleSelection":
            return jsonify({
                "success": False,
                "message": "Roles can no longer be changed."
            }), 400

        cur.execute("""
            DELETE FROM buyer
            WHERE room_id = %s
        """, (room_id,))

        cur.execute("""
            DELETE FROM seller
            WHERE room_id = %s
        """, (room_id,))

        cur.execute("""
            UPDATE room
            SET
                status = 'Accepted',
                current_step = 'RoleSelection'
            WHERE room_id = %s
        """, (room_id,))

        conn.commit()

        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "buyer_id": None,
            "buyer_ready": False,
            "seller_id": None,
            "seller_ready": False,
            "status": "Accepted",
            "current_step": "RoleSelection",
            "message": "Role selection was reset."
        }

        socketio.emit(
            "role_selection_reset",
            socket_data,
            room=f"deal_{room_code}"
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