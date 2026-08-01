from flask import Blueprint, request, jsonify
from database import get_db
from socketio_instance import socketio
import traceback
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
deal_bp = Blueprint("deal", __name__)
MONEY_QUANTUM = Decimal("0.01")
MAX_DEAL_AMOUNT = Decimal("9999999999.99")





def calculate_service_fee(amount):
    if amount <= Decimal("50.00"):
        fee = amount * Decimal("0.005")
    elif amount <= Decimal("250.00"):
        fee = Decimal("1.00")
    else:
        fee = amount * Decimal("0.01")

    return fee.quantize(
        MONEY_QUANTUM,
        rounding=ROUND_HALF_UP,
    )

def parse_deal_amount(value):
    try:
        amount = Decimal(str(value)).quantize(
            MONEY_QUANTUM,
            rounding=ROUND_HALF_UP,
        )
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError("Amount must be a valid number.")

    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")

    if amount > MAX_DEAL_AMOUNT:
        raise ValueError("Amount is too large.")

    return amount


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



# ======================================================
# GET CURRENT AMOUNT NEGOTIATION STATE
# ======================================================
@deal_bp.route("/deals/<room_code>/amount", methods=["GET"])
def get_deal_amount(room_code):
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
                r.agreed_price,
                b.buyer_id,
                b.agreed_amount,
                COALESCE(b.amount_confirmed, FALSE),
                s.seller_id,
                s.agreed_amount,
                COALESCE(s.amount_confirmed, FALSE)
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
            room_status,
            current_step,
            current_amount,
            buyer_id,
            buyer_amount,
            buyer_confirmed,
            seller_id,
            seller_amount,
            seller_confirmed,
        ) = row

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id),
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403

        my_role = None
        my_confirmed = False

        if buyer_id and str(user_id) == str(buyer_id):
            my_role = "buyer"
            my_confirmed = bool(buyer_confirmed)
        elif seller_id and str(user_id) == str(seller_id):
            my_role = "seller"
            my_confirmed = bool(seller_confirmed)

        proposed_by_user_id = creator_id

        if buyer_amount is not None and seller_amount is None:
            proposed_by_user_id = buyer_id
        elif seller_amount is not None and buyer_amount is None:
            proposed_by_user_id = seller_id

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code,
            "status": room_status,
            "current_step": current_step,
            "current_amount": (
                float(current_amount)
                if current_amount is not None
                else None
            ),
            "proposed_by_user_id": proposed_by_user_id,
            "buyer_id": buyer_id,
            "buyer_amount": (
                float(buyer_amount)
                if buyer_amount is not None
                else None
            ),
            "buyer_amount_confirmed": bool(buyer_confirmed),
            "seller_id": seller_id,
            "seller_amount": (
                float(seller_amount)
                if seller_amount is not None
                else None
            ),
            "seller_amount_confirmed": bool(seller_confirmed),
            "my_role": my_role,
            "my_amount_confirmed": my_confirmed,
            "both_amount_confirmed": bool(
                buyer_confirmed and seller_confirmed
            ),
        }), 200

    except Exception as error:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(error),
        }), 500

    finally:
        cur.close()
        conn.close()


# ======================================================
# PROPOSE A NEW DEAL AMOUNT
# Resets both users' previous confirmations.
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/propose-amount",
    methods=["POST"],
)
def propose_amount(room_code):
    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    raw_amount = data.get("amount")

    if not user_id or raw_amount is None:
        return jsonify({
            "success": False,
            "message": "User ID and amount are required."
        }), 400

    try:
        amount = parse_deal_amount(raw_amount)
    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error),
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
            current_step,
        ) = room

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id),
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403

        if current_step != "DealConfirmation":
            return jsonify({
                "success": False,
                "message": (
                    "This room is not in amount negotiation."
                ),
            }), 400

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
                "message": "Deal roles have not been assigned."
            }), 400

        buyer_id = buyer[0]
        seller_id = seller[0]

        if str(user_id) == str(buyer_id):
            proposer_role = "buyer"
        elif str(user_id) == str(seller_id):
            proposer_role = "seller"
        else:
            return jsonify({
                "success": False,
                "message": "You are not assigned to this deal."
            }), 403
                # The previous fee agreement no longer applies when
        # either participant proposes a different amount.
        cur.execute("""
            DELETE FROM deal_fee_agreement
            WHERE room_id = %s
        """, (room_id,))
        # A new proposal invalidates every old confirmation.
        cur.execute("""
            UPDATE buyer
            SET
                agreed_amount = NULL,
                amount_confirmed = FALSE
            WHERE room_id = %s
        """, (room_id,))

        cur.execute("""
            UPDATE seller
            SET
                agreed_amount = NULL,
                amount_confirmed = FALSE
            WHERE room_id = %s
        """, (room_id,))

                # The proposer automatically confirms their own
        # newly proposed amount. The partner must still
        # confirm it separately.
        if proposer_role == "buyer":
            cur.execute("""
                UPDATE buyer
                SET
                    agreed_amount = %s,
                    amount_confirmed = TRUE
                WHERE room_id = %s
            """, (amount, room_id))
        else:
            cur.execute("""
                UPDATE seller
                SET
                    agreed_amount = %s,
                    amount_confirmed = TRUE
                WHERE room_id = %s
            """, (amount, room_id))

        cur.execute("""
            UPDATE room
            SET
                agreed_price = %s,
                escrow_fee = 0,
                total_paid = 0,
                current_step = 'DealConfirmation'
            WHERE room_id = %s
            """, (amount, room_id))

        conn.commit()

        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "current_amount": float(amount),
            "proposed_by_user_id": int(user_id),
            "proposer_role": proposer_role,
            "buyer_amount_confirmed": (proposer_role == "buyer"),
            "seller_amount_confirmed": (proposer_role == "seller"),
            "status": room_status,"current_step": "DealConfirmation",}

        socketio.emit(
            "amount_proposed",
            socket_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            socket_data,
            room=f"deal_{room_code}",
        )

        user_socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "amount",
        }

        socketio.emit(
            "user_data_changed",
            user_socket_data,
            room=f"user_{buyer_id}",
        )

        socketio.emit(
            "user_data_changed",
            user_socket_data,
            room=f"user_{seller_id}",
        )

        return jsonify({
            "success": True,
            **socket_data,
            "message": "New amount proposed.",
        }), 200

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(error),
        }), 500

    finally:
        cur.close()
        conn.close()

# ======================================================
# CONFIRM THE CURRENT CANONICAL DEAL AMOUNT
# ======================================================
@deal_bp.route( "/deals/<room_code>/confirm-amount", methods=["POST"],)
def confirm_amount(room_code):
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
                current_step,
                agreed_price
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
            current_step,
            current_amount,
        ) = room

        if str(user_id) not in [
            str(creator_id),
            str(invited_user_id),
        ]:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }), 403

        if current_step != "DealConfirmation":
            return jsonify({
                "success": False,
                "message": (
                    "This room is not in amount negotiation."
                ),
            }), 400

        if current_amount is None:
            return jsonify({
                "success": False,
                "message": "No amount has been proposed."
            }), 400

        current_amount = parse_deal_amount(current_amount)

        cur.execute("""
            SELECT
                buyer_id,
                agreed_amount,
                COALESCE(amount_confirmed, FALSE)
            FROM buyer
            WHERE room_id = %s
        """, (room_id,))
        buyer = cur.fetchone()

        cur.execute("""
            SELECT
                seller_id,
                agreed_amount,
                COALESCE(amount_confirmed, FALSE)
            FROM seller
            WHERE room_id = %s
        """, (room_id,))
        seller = cur.fetchone()

        if not buyer or not seller:
            return jsonify({
                "success": False,
                "message": "Deal roles have not been assigned."
            }), 400

        buyer_id, buyer_amount, buyer_confirmed = buyer
        seller_id, seller_amount, seller_confirmed = seller

        if str(user_id) == str(buyer_id):
            my_role = "buyer"

            cur.execute("""
                UPDATE buyer
                SET
                    agreed_amount = %s,
                    amount_confirmed = TRUE
                WHERE room_id = %s
            """, (current_amount, room_id))

        elif str(user_id) == str(seller_id):
            my_role = "seller"

            cur.execute("""
                UPDATE seller
                SET
                    agreed_amount = %s,
                    amount_confirmed = TRUE
                WHERE room_id = %s
            """, (current_amount, room_id))

        else:
            return jsonify({
                "success": False,
                "message": "You are not assigned to this deal."
            }), 403

        # Read the authoritative values after this confirmation.
        cur.execute("""
            SELECT
                agreed_amount,
                COALESCE(amount_confirmed, FALSE)
            FROM buyer
            WHERE room_id = %s
        """, (room_id,))
        buyer_amount, buyer_confirmed = cur.fetchone()

        cur.execute("""
            SELECT
                agreed_amount,
                COALESCE(amount_confirmed, FALSE)
            FROM seller
            WHERE room_id = %s
        """, (room_id,))
        seller_amount, seller_confirmed = cur.fetchone()

        buyer_matches = (
            buyer_amount is not None
            and Decimal(buyer_amount) == current_amount
        )

        seller_matches = (
            seller_amount is not None
            and Decimal(seller_amount) == current_amount
        )

        both_confirmed = bool(
            buyer_confirmed
            and seller_confirmed
            and buyer_matches
            and seller_matches
        )

        service_fee = None
        total_paid = None

        if both_confirmed:
            service_fee = calculate_service_fee(current_amount)

            # Create the temporary fee-negotiation record.
            # No payer is selected yet, so deposit and receipt
            # totals remain empty until the next stage.
            cur.execute("""
                INSERT INTO deal_fee_agreement (
                    room_id,
                    fee_payer,
                    proposed_by,
                    fee_amount,
                    buyer_deposit,
                    seller_receive,
                    buyer_confirmed,
                    seller_confirmed,
                    updated_at
                )
                VALUES (
                    %s,
                    NULL,
                    NULL,
                    %s,
                    NULL,
                    NULL,
                    FALSE,
                    FALSE,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (room_id)
                DO UPDATE SET
                    fee_payer = NULL,
                    proposed_by = NULL,
                    fee_amount = EXCLUDED.fee_amount,
                    buyer_deposit = NULL,
                    seller_receive = NULL,
                    buyer_confirmed = FALSE,
                    seller_confirmed = FALSE,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                room_id,
                service_fee,
            ))

            cur.execute("""
                UPDATE room
                SET
                    current_step = 'FeeConfirmation',
                    escrow_fee = 0,
                    total_paid = 0
                WHERE room_id = %s
            """, (room_id,))
        conn.commit()
        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "current_amount": float(current_amount),
            "buyer_id": buyer_id,
            "buyer_amount": (
                float(buyer_amount)
                if buyer_amount is not None
                else None
            ),
            "buyer_amount_confirmed": bool(buyer_confirmed),
            "seller_id": seller_id,
            "seller_amount": (
                float(seller_amount)
                if seller_amount is not None
                else None
            ),
            "seller_amount_confirmed": bool(seller_confirmed),
            "confirmed_by_user_id": int(user_id),
            "confirmed_by_role": my_role,
            "both_amount_confirmed": both_confirmed,
            "service_fee": (
                float(service_fee)
                if service_fee is not None
                else None
            ),
            "total_paid": (
                float(total_paid)
                if total_paid is not None
                else None
            ),
            "status": room_status,
            "current_step": (
            "FeeConfirmation"
                if both_confirmed
                else "DealConfirmation"
            ),
        }

        socketio.emit(
            (
                "amount_confirmed"
                if both_confirmed
                else "amount_confirmation_updated"
            ),
            socket_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            socket_data,
            room=f"deal_{room_code}",
        )

        user_socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "amount",
        }

        socketio.emit(
            "user_data_changed",
            user_socket_data,
            room=f"user_{buyer_id}",
        )

        socketio.emit(
            "user_data_changed",
            user_socket_data,
            room=f"user_{seller_id}",
        )

        return jsonify({
            "success": True,
            **socket_data,
            "message": (
                "Both users confirmed the amount."
                if both_confirmed
                else "Amount confirmation saved."
            ),
        }), 200

    except ValueError as error:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(error),
        }), 400

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(error),
        }), 500

    finally:
        cur.close()
        conn.close()