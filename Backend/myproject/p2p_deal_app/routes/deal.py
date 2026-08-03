import os
import traceback
from decimal import (
    Decimal,
    InvalidOperation,
    ROUND_HALF_UP,
)
from uuid import uuid4

from flask import (
    Blueprint,
    g,
    jsonify,
    request,
    send_file,
)

from database import get_db
from services.auth_required import login_required
from services.wallet_service import (
    WalletError,
    refund_escrow_to_buyer,
    release_escrow_to_seller,
)
from socketio_instance import socketio



deal_bp = Blueprint("deal", __name__)
MONEY_QUANTUM = Decimal("0.01")



MAX_DEAL_AMOUNT = Decimal("9999999999.99")
DEAL_PROOF_FOLDER = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "uploads",
    "deal_proofs",
)

ALLOWED_DEAL_PROOF_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "pdf",
}

# Maximum actual proof file size: 5 MB.
MAX_DEAL_PROOF_SIZE = 5 * 1024 * 1024

# Allow extra space for multipart form metadata.
MAX_DEAL_PROOF_REQUEST_SIZE = (
    MAX_DEAL_PROOF_SIZE
    + 256 * 1024
)

os.makedirs(
    DEAL_PROOF_FOLDER,
    exist_ok=True,
)


def get_proof_extension(filename):
    if "." not in filename:
        return None

    extension = (
        filename.rsplit(".", 1)[1]
        .strip()
        .lower()
    )

    if extension not in ALLOWED_DEAL_PROOF_EXTENSIONS:
        return None

    return extension




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

# ======================================================
# SELLER SUBMITS FULFILLMENT EVIDENCE
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/fulfillment",
    methods=["POST"],
)
@login_required
def submit_fulfillment(room_code):
    authenticated_user_id = g.current_user_id

    description = request.form.get(
        "description",
        "",
    ).strip()

    courier_name = request.form.get(
        "courier_name",
        "",
    ).strip()

    tracking_number = request.form.get(
        "tracking_number",
        "",
    ).strip()

    proof = request.files.get("proof")
    proof_filepath = None

    if (
        request.content_length is not None
        and request.content_length
            > MAX_DEAL_PROOF_REQUEST_SIZE
        ):
        return jsonify({
            "success": False,
            "message": (
                "Fulfillment proof must not exceed 5 MB."
            ),
        }), 413

    if proof is None or not proof.filename:
        return jsonify({
            "success": False,
            "message": (
                "Fulfillment proof is required."
            ),
        }), 400

    extension = get_proof_extension(
        proof.filename
    )

    if extension is None:
        return jsonify({
            "success": False,
            "message": (
                "Proof must be PNG, JPG, JPEG, or PDF."
            ),
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
    """
    SELECT
        r.room_id,
        r.product_type,
        r.current_step,
        r.payment_status,
        b.buyer_id,
        s.seller_id,
        e.status,
        c.status
    FROM room r
    JOIN buyer b
        ON b.room_id = r.room_id
    JOIN seller s
        ON s.room_id = r.room_id
    JOIN deal_escrow e
        ON e.room_id = r.room_id
    LEFT JOIN deal_cancellation_request c
        ON c.room_id = r.room_id
    WHERE r.room_code = %s
    FOR UPDATE OF r, b, s, e
    """,
    (room_code,),
    )

        deal = cursor.fetchone()

        if not deal:
            return jsonify({
                "success": False,
                "message": (
                    "Paid deal escrow was not found."
                ),
            }), 404

        (
            room_id,
            product_type,
            current_step,
            payment_status,
            buyer_id,
            seller_id,
            escrow_status,
            cancellation_status,
        ) = deal

        if authenticated_user_id != seller_id:
            return jsonify({
                "success": False,
                "message": (
                    "Only the assigned seller can "
                    "submit fulfillment."
                ),
            }), 403

        if (
            current_step != "Delivery"
            or payment_status != "Paid"
            or escrow_status != "Held"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "This deal is not ready for "
                    "seller fulfillment."
                ),
            }), 409
        if cancellation_status == "Pending":
            return jsonify({
                "success": False,
                "message": (
                    "Fulfillment cannot be submitted while "
                    "a cancellation request is pending."
                ),
            }), 409

        if product_type == "Physical":
            if not courier_name:
                return jsonify({
                    "success": False,
                    "message": (
                        "Courier name is required for "
                        "a physical product."
                    ),
                }), 400

            if not tracking_number:
                return jsonify({
                    "success": False,
                    "message": (
                        "Tracking number is required for "
                        "a physical product."
                    ),
                }), 400

            shipping_status = "Shipped"

        elif product_type == "Digital":
            if len(description) < 5:
                return jsonify({
                    "success": False,
                    "message": (
                        "Describe how the digital product "
                        "was delivered."
                    ),
                }), 400

            courier_name = None
            tracking_number = None
            shipping_status = "Delivered"

        else:
            return jsonify({
                "success": False,
                "message": (
                    "The deal product type is invalid."
                ),
            }), 409

        cursor.execute(
            """
            SELECT proof_id
            FROM deal_proofs
            WHERE room_id = %s
              AND proof_type = 'Fulfillment'
            FOR UPDATE
            """,
            (room_id,),
        )

        if cursor.fetchone():
            return jsonify({
                "success": False,
                "message": (
                    "Fulfillment was already submitted "
                    "for this deal."
                ),
            }), 409

        proof_filename = (
            f"room_{room_id}_"
            f"seller_{seller_id}_"
            f"{uuid4().hex}.{extension}"
        )

        proof_filepath = os.path.join(
            DEAL_PROOF_FOLDER,
            proof_filename,
        )

        proof.save(proof_filepath)

        stored_path = (
            f"deal_proofs/{proof_filename}"
        )

        cursor.execute(
            """
            INSERT INTO deal_proofs (
                room_id,
                user_id,
                proof_type,
                file_path,
                description,
                courier_name,
                tracking_number,
                reviewed
            )
            VALUES (
                %s,
                %s,
                'Fulfillment',
                %s,
                %s,
                %s,
                %s,
                FALSE
            )
            RETURNING proof_id
            """,
            (
                room_id,
                seller_id,
                stored_path,
                description or None,
                courier_name,
                tracking_number,
            ),
        )

        proof_id = cursor.fetchone()[0]

        cursor.execute(
            """
            UPDATE room
            SET
                shipping_status = %s,
                courier_name = %s,
                tracking_number = %s
            WHERE room_id = %s
            """,
            (
                shipping_status,
                courier_name,
                tracking_number,
                room_id,
            ),
        )

        conn.commit()

        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "fulfillment",
            "product_type": product_type,
            "shipping_status": shipping_status,
            "proof_id": proof_id,
        }

        socketio.emit(
            "fulfillment_submitted",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "user_data_changed",
            event_data,
            room=f"user_{buyer_id}",
        )

        socketio.emit(
            "user_data_changed",
            event_data,
            room=f"user_{seller_id}",
        )

        return jsonify({
            "success": True,
            "message": (
                "Fulfillment evidence was submitted."
            ),
            "fulfillment": {
                "proof_id": proof_id,
                "proof_url": (
                        f"/api/deals/{room_code}"
                        "/fulfillment/proof"
                ),
                "product_type": product_type,
                "shipping_status": shipping_status,
                "description": description or None,
                "courier_name": courier_name,
                "tracking_number": tracking_number,
            },
        }), 201

    except Exception as error:
        conn.rollback()

        # The database transaction cannot automatically
        # remove a file already written to disk.
        if (
            proof_filepath
            and os.path.exists(proof_filepath)
        ):
            os.remove(proof_filepath)

        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to submit fulfillment evidence."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()

# ======================================================
# GET FULFILLMENT STATE
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/fulfillment",
    methods=["GET"],
)
@login_required
def get_fulfillment(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                r.room_id,
                r.product_type,
                r.current_step,
                r.payment_status,
                r.shipping_status,
                r.courier_name,
                r.tracking_number,
                b.buyer_id,
                s.seller_id,
                p.proof_id,
                p.description,
                p.uploaded_at
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            LEFT JOIN deal_proofs p
                ON p.room_id = r.room_id
               AND p.proof_type = 'Fulfillment'
            WHERE r.room_code = %s
            """,
            (room_code,),
        )

        fulfillment = cursor.fetchone()

        if not fulfillment:
            return jsonify({
                "success": False,
                "message": "Deal not found.",
            }), 404

        (
            room_id,
            product_type,
            current_step,
            payment_status,
            shipping_status,
            courier_name,
            tracking_number,
            buyer_id,
            seller_id,
            proof_id,
            description,
            uploaded_at,
        ) = fulfillment

        if authenticated_user_id not in {
            buyer_id,
            seller_id,
        }:
            return jsonify({
                "success": False,
                "message": (
                    "You are not assigned to this deal."
                ),
            }), 403

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code,
            "current_step": current_step,
            "payment_status": payment_status,
            "product_type": product_type,
            "shipping_status": shipping_status,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "my_role": (
                "buyer"
                if authenticated_user_id == buyer_id
                else "seller"
            ),
            "fulfillment_submitted": (
                proof_id is not None
            ),
            "fulfillment": (
                {
                    "proof_id": proof_id,
                    "proof_url": (
                        f"/api/deals/{room_code}"
                        "/fulfillment/proof"
                    ),
                    "description": description,
                    "courier_name": courier_name,
                    "tracking_number": tracking_number,
                    "uploaded_at": (
                        uploaded_at.isoformat()
                        if uploaded_at
                        else None
                    ),
                }
                if proof_id is not None
                else None
            ),
        }), 200

    except Exception as error:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load fulfillment data."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()


# ======================================================
# GET PROTECTED FULFILLMENT PROOF
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/fulfillment/proof",
    methods=["GET"],
)
@login_required
def get_fulfillment_proof(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                b.buyer_id,
                s.seller_id,
                p.file_path
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_proofs p
                ON p.room_id = r.room_id
               AND p.proof_type = 'Fulfillment'
            WHERE r.room_code = %s
            """,
            (room_code,),
        )

        proof = cursor.fetchone()

        if not proof:
            return jsonify({
                "success": False,
                "message": (
                    "Fulfillment proof was not found."
                ),
            }), 404

        buyer_id, seller_id, stored_path = proof

        if authenticated_user_id not in {
            buyer_id,
            seller_id,
        }:
            return jsonify({
                "success": False,
                "message": (
                    "You are not assigned to this deal."
                ),
            }), 403

        expected_prefix = "deal_proofs/"

        if not stored_path.startswith(expected_prefix):
            return jsonify({
                "success": False,
                "message": (
                    "The stored proof path is invalid."
                ),
            }), 500

        proof_filename = os.path.basename(
            stored_path
        )

        proof_filepath = os.path.join(
            DEAL_PROOF_FOLDER,
            proof_filename,
        )

        if not os.path.isfile(proof_filepath):
            return jsonify({
                "success": False,
                "message": (
                    "The proof file is missing."
                ),
            }), 404

        return send_file(
            proof_filepath,
            as_attachment=False,
            download_name=proof_filename,
        )

    except Exception as error:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load fulfillment proof."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()

# ======================================================
# BUYER CONFIRMS RECEIPT AND COMPLETES THE DEAL
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/confirm-received",
    methods=["POST"],
)
@login_required
def confirm_received(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                r.room_id,
                r.status,
                r.current_step,
                r.payment_status,
                r.shipping_status,
                r.item_name,
                r.item_description,
                r.agreed_price,
                r.payment_verified_at,
                r.bakong_transaction_id,
                r.payment_provider,
                b.buyer_id,
                s.seller_id,
                f.fee_payer,
                f.fee_amount,
                f.seller_receive,
                e.status,
                e.held_amount,
                p.file_path,
                p.uploaded_at
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_fee_agreement f
                ON f.room_id = r.room_id
            JOIN deal_escrow e
                ON e.room_id = r.room_id
            JOIN deal_proofs p
                ON p.room_id = r.room_id
               AND p.proof_type = 'Fulfillment'
            WHERE r.room_code = %s
            FOR UPDATE OF r, b, s, f, e
            """,
            (room_code,),
        )

        deal = cursor.fetchone()

        if not deal:
            return jsonify({
                "success": False,
                "message": (
                    "Completed fulfillment data was "
                    "not found for this deal."
                ),
            }), 404

        (
            room_id,
            room_status,
            current_step,
            payment_status,
            shipping_status,
            item_name,
            item_description,
            agreed_price,
            payment_verified_at,
            bakong_transaction_id,
            payment_provider,
            buyer_id,
            seller_id,
            fee_payer,
            fee_amount,
            seller_receive,
            escrow_status,
            held_amount,
            fulfillment_proof,
            fulfillment_uploaded_at,
        ) = deal

        if authenticated_user_id != buyer_id:
            return jsonify({
                "success": False,
                "message": (
                    "Only the assigned buyer can "
                    "confirm receipt."
                ),
            }), 403

        # Repeated requests return the existing completed
        # transaction instead of releasing funds twice.
        if (
            room_status == "Completed"
            and current_step == "Completed"
            and payment_status == "Released"
            and escrow_status == "Released"
        ):
            cursor.execute(
                """
                SELECT transaction_id
                FROM transactions_history
                WHERE room_code = %s
                  AND transaction_status = 'Completed'
                """,
                (room_code,),
            )

            completed_transaction = cursor.fetchone()

            if not completed_transaction:
                raise WalletError(
                    "The completed transaction record "
                    "is missing."
                )

            return jsonify({
                "success": True,
                "reused": True,
                "message": (
                    "This deal is already completed."
                ),
                "transaction_id": (
                    completed_transaction[0]
                ),
                "current_step": "Completed",
                "payment_status": "Released",
            }), 200

        if room_status == "Cancelled":
            return jsonify({
                "success": False,
                "message": (
                    "A cancelled deal cannot be completed."
                ),
            }), 409

        if (
            current_step != "Delivery"
            or payment_status != "Paid"
            or escrow_status != "Held"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "This deal is not ready for "
                    "buyer confirmation."
                ),
            }), 409

        if shipping_status not in {
            "Shipped",
            "Delivered",
        }:
            return jsonify({
                "success": False,
                "message": (
                    "The seller has not submitted valid "
                    "fulfillment evidence."
                ),
            }), 409

        release_result = release_escrow_to_seller(
            cursor,
            room_id=room_id,
            room_code=room_code,
        )

        cursor.execute(
            """
            INSERT INTO transactions_history (
                room_id,
                room_code,
                buyer_id,
                seller_id,
                item_name,
                item_description,
                agreed_price,
                transaction_amount,
                fee_amount,
                seller_receive,
                platform_income,
                fulfillment_proof,
                fulfillment_uploaded_at,
                payment_verified_at,
                released_at,
                transaction_status,
                completed_at,
                bakong_transaction_id,
                payment_provider,
                fee_payer
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP,
                'Completed',
                CURRENT_TIMESTAMP,
                %s,
                %s,
                %s
            )
            RETURNING transaction_id
            """,
            (
                room_id,
                room_code,
                buyer_id,
                seller_id,
                item_name,
                item_description,
                agreed_price,
                release_result["held_amount"],
                release_result["fee_amount"],
                release_result["seller_receive"],
                release_result["fee_amount"],
                fulfillment_proof,
                fulfillment_uploaded_at,
                payment_verified_at,
                bakong_transaction_id,
                payment_provider,
                fee_payer,
            ),
        )

        transaction_id = cursor.fetchone()[0]
                # Permanently record platform income in the same
        # transaction as release and completion.
        if (
            release_result["fee_amount"]
            > Decimal("0.00")
        ):
            charged_user_id = (
                seller_id
                if fee_payer == "seller"
                else buyer_id
            )

            cursor.execute(
                """
                INSERT INTO platform_fee_transactions (
                    room_id,
                    room_code,
                    transaction_id,
                    charged_user_id,
                    agreed_fee_payer,
                    event_type,
                    payment_method,
                    fee_amount,
                    currency,
                    reference_key
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    'Completed',
                    %s,
                    %s,
                    'USD',
                    %s
                )
                ON CONFLICT (reference_key)
                DO NOTHING
                """,
                (
                    room_id,
                    room_code,
                    transaction_id,
                    charged_user_id,
                    fee_payer,
                    release_result[
                        "payment_method"
                    ],
                    release_result["fee_amount"],
                    (
                        f"deal:{room_code}:"
                        "completed_fee"
                    ),
                ),
            )
        cursor.execute(
            """
            UPDATE room
            SET
                status = 'Completed',
                current_step = 'Completed',
                payment_status = 'Released',
                completed_at = CURRENT_TIMESTAMP
            WHERE room_id = %s
            """,
            (room_id,),
        )

        conn.commit()

        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "completion",
            "transaction_id": transaction_id,
            "status": "Completed",
            "current_step": "Completed",
            "payment_status": "Released",
        }

        socketio.emit(
            "deal_completed",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            event_data,
            room=f"deal_{room_code}",
        )

        for user_id in {buyer_id, seller_id}:
            socketio.emit(
                "wallet_updated",
                {
                    **event_data,
                    "resource": "wallet",
                },
                room=f"user_{user_id}",
            )

            socketio.emit(
                "user_data_changed",
                event_data,
                room=f"user_{user_id}",
            )

        # Live-sync the admin dashboard's Transactions and
        # Completed Deals stat cards (see AdminLayout.jsx /
        # Dashboard.jsx "admin-transaction-updated" listener).
        socketio.emit(
            "transaction_completed",
            event_data,
            room="admins",
        )

        return jsonify({
            "success": True,
            "reused": False,
            "message": (
                "Receipt confirmed and deal completed."
            ),
            "transaction_id": transaction_id,
            "buyer": {
                "available_balance": float(
                    release_result[
                        "buyer_available_balance"
                    ]
                ),
                "held_balance": float(
                    release_result[
                        "buyer_pending_balance"
                    ]
                ),
            },
            "seller": {
                "credited_amount": float(
                    release_result["seller_receive"]
                ),
                "available_balance": float(
                    release_result[
                        "seller_available_balance"
                    ]
                ),
            },
            "platform_fee": float(
                release_result["fee_amount"]
            ),
            "status": "Completed",
            "current_step": "Completed",
            "payment_status": "Released",
        }), 200

    except WalletError as error:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(error),
        }), 409

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to complete this deal."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()

# ======================================================
# GET FUNDED-DEAL CANCELLATION STATUS
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/cancellation",
    methods=["GET"],
)
@login_required
def get_cancellation_status(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                r.room_id,
                r.status,
                r.current_step,
                r.payment_status,
                r.shipping_status,
                b.buyer_id,
                s.seller_id,
                e.held_amount,
                e.fee_amount,
                e.status,
                f.fee_payer,
                c.requested_by,
                c.rejected_by,
                c.reason,
                c.buyer_confirmed,
                c.seller_confirmed,
                c.status,
                c.refund_amount,
                c.retained_fee,
                c.requested_at,
                c.updated_at,
                c.processed_at
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_escrow e
                ON e.room_id = r.room_id
            JOIN deal_fee_agreement f
                ON f.room_id = r.room_id
            LEFT JOIN deal_cancellation_request c
                ON c.room_id = r.room_id
            WHERE r.room_code = %s
            """,
            (room_code,),
        )

        state = cursor.fetchone()

        if not state:
            return jsonify({
                "success": False,
                "message": (
                    "Funded deal was not found."
                ),
            }), 404

        (
            room_id,
            room_status,
            current_step,
            payment_status,
            shipping_status,
            buyer_id,
            seller_id,
            held_amount,
            fee_amount,
            escrow_status,
            fee_payer,
            requested_by,
            rejected_by,
            reason,
            buyer_confirmed,
            seller_confirmed,
            cancellation_status,
            stored_refund_amount,
            stored_retained_fee,
            requested_at,
            updated_at,
            processed_at,
        ) = state

        if authenticated_user_id not in {
            buyer_id,
            seller_id,
        }:
            return jsonify({
                "success": False,
                "message": (
                    "You are not assigned to this deal."
                ),
            }), 403

        held_amount = Decimal(held_amount)
        fee_amount = Decimal(fee_amount)
        refund_preview = held_amount - fee_amount
        cancellation_allowed = (
            room_status not in {"Completed", "Cancelled"}
            and current_step == "Delivery"
            and payment_status == "Paid"
            and escrow_status == "Held"
            and (
                not shipping_status
                or shipping_status == "NotShipped"
            )
        )
        cancellation_message = None
        if requested_by is not None:
            requester_role = (
                "Buyer"
                if requested_by == buyer_id
                else "Seller"
            )

            if cancellation_status == "Pending":
                waiting_for = (
                    "seller"
                    if requested_by == buyer_id
                    else "buyer"
                )

                cancellation_message = (
                    f"{requester_role} requested "
                    f"cancellation. Refund if approved: "
                    f"${refund_preview:.2f}. "
                    f"Non-refundable service fee: "
                    f"${fee_amount:.2f}. "
                    f"Waiting for the {waiting_for}."
                )

            elif cancellation_status == "Rejected":
                cancellation_message = (
                    "The cancellation request was "
                    "rejected. The deal remains active "
                    "and escrow funds remain protected."
                )

            elif cancellation_status == "Processed":
                cancellation_message = (
                    "Deal cancelled by mutual agreement. "
                    f"Buyer wallet refund: "
                    f"${Decimal(stored_refund_amount):.2f}. "
                    f"Service fee retained: "
                    f"${Decimal(stored_retained_fee):.2f}. "
                    "Seller received: $0.00."
                )

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code,
            "room_status": room_status,
            "current_step": current_step,
            "shipping_status": shipping_status,
            "payment_status": payment_status,
            "escrow_status": escrow_status,
            "cancellation_allowed": cancellation_allowed,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "my_role": (
                "buyer"
                if authenticated_user_id == buyer_id
                else "seller"
            ),
            "held_amount": float(held_amount),
            "refund_preview": float(refund_preview),
            "non_refundable_fee": float(fee_amount),
            "agreed_fee_payer": fee_payer,
            "cancellation": (
                {
                    "requested_by": requested_by,
                    "rejected_by": rejected_by,
                    "reason": reason,
                    "message": cancellation_message,
                    "buyer_confirmed": bool(
                        buyer_confirmed
                    ),
                    "seller_confirmed": bool(
                        seller_confirmed
                    ),
                    "status": cancellation_status,
                    "refund_amount": (
                        float(stored_refund_amount)
                        if stored_refund_amount
                        is not None
                        else None
                    ),
                    "retained_fee": (
                        float(stored_retained_fee)
                        if stored_retained_fee
                        is not None
                        else None
                    ),
                    "requested_at": (
                        requested_at.isoformat()
                        if requested_at
                        else None
                    ),
                    "updated_at": (
                        updated_at.isoformat()
                        if updated_at
                        else None
                    ),
                    "processed_at": (
                        processed_at.isoformat()
                        if processed_at
                        else None
                    ),
                }
                if requested_by is not None
                else None
            ),
        }), 200

    except Exception as error:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load cancellation status."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()


# ======================================================
# REQUEST MUTUAL CANCELLATION
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/request-cancellation",
    methods=["POST"],
)
@login_required
def request_cancellation(room_code):
    authenticated_user_id = g.current_user_id

    data = request.get_json(silent=True) or {}
    reason = str(
        data.get("reason", "")
    ).strip()

    if len(reason) < 5:
        return jsonify({
            "success": False,
            "message": (
                "Cancellation reason must contain "
                "at least 5 characters."
            ),
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                r.room_id,
                r.status,
                r.current_step,
                r.payment_status,
                r.shipping_status,
                b.buyer_id,
                s.seller_id,
                e.status
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_escrow e
                ON e.room_id = r.room_id
            WHERE r.room_code = %s
            FOR UPDATE OF r, b, s, e
            """,
            (room_code,),
        )

        deal = cursor.fetchone()

        if not deal:
            return jsonify({
                "success": False,
                "message": (
                    "Funded deal was not found."
                ),
            }), 404

        (
            room_id,
            room_status,
            current_step,
            payment_status,
            shipping_status,
            buyer_id,
            seller_id,
            escrow_status,
        ) = deal

        if authenticated_user_id not in {
            buyer_id,
            seller_id,
        }:
            return jsonify({
                "success": False,
                "message": (
                    "You are not assigned to this deal."
                ),
            }), 403

        if room_status in {
            "Completed",
            "Cancelled",
        }:
            return jsonify({
                "success": False,
                "message": (
                    "A finished deal cannot request "
                    "cancellation."
                ),
            }), 409

        # verifies payment is held and the deal is active.
        if (
            current_step != "Delivery"
            or payment_status != "Paid"
            or escrow_status != "Held"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Only a funded active deal can "
                    "request mutual cancellation."
                ),
            }), 409
        # prevents cancellation after fulfillment evidence
        if (
            shipping_status
            and shipping_status != "NotShipped"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Cancellation is no longer available "
                    "after fulfillment evidence is "
                    "submitted. The deal must continue "
                    "through receipt confirmation or "
                    "dispute resolution."
                ),
            }), 409

        cursor.execute(
            """
            SELECT status
            FROM deal_cancellation_request
            WHERE room_id = %s
            FOR UPDATE
            """,
            (room_id,),
        )

        existing_request = cursor.fetchone()

        if (
            existing_request
            and existing_request[0] == "Pending"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "A cancellation request is already "
                    "waiting for the partner."
                ),
            }), 409

        if (
            existing_request
            and existing_request[0] == "Processed"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Cancellation was already processed."
                ),
            }), 409

        buyer_confirmed = (
            authenticated_user_id == buyer_id
        )
        seller_confirmed = (
            authenticated_user_id == seller_id
        )

        cursor.execute(
            """
            INSERT INTO deal_cancellation_request (
                room_id,
                requested_by,
                rejected_by,
                reason,
                buyer_confirmed,
                seller_confirmed,
                status,
                refund_amount,
                retained_fee,
                requested_at,
                updated_at,
                processed_at
            )
            VALUES (
                %s,
                %s,
                NULL,
                %s,
                %s,
                %s,
                'Pending',
                NULL,
                NULL,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                NULL
            )
            ON CONFLICT (room_id)
            DO UPDATE SET
                requested_by = EXCLUDED.requested_by,
                rejected_by = NULL,
                reason = EXCLUDED.reason,
                buyer_confirmed =
                    EXCLUDED.buyer_confirmed,
                seller_confirmed =
                    EXCLUDED.seller_confirmed,
                status = 'Pending',
                refund_amount = NULL,
                retained_fee = NULL,
                requested_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                processed_at = NULL
            """,
            (
                room_id,
                authenticated_user_id,
                reason,
                buyer_confirmed,
                seller_confirmed,
            ),
        )

        conn.commit()
        requester_role = (
            "Buyer"
            if authenticated_user_id == buyer_id
            else "Seller"
        )

        waiting_for = (
            "seller"
            if authenticated_user_id == buyer_id
            else "buyer"
        )

        message = (
            f"{requester_role} requested cancellation. "
            f"Waiting for the {waiting_for} to respond."
        )
        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "cancellation",
            "requested_by": authenticated_user_id,
            "buyer_confirmed": buyer_confirmed,
            "seller_confirmed": seller_confirmed,
            "status": "Pending",
            "message": message,
        }

        socketio.emit(
            "cancellation_requested",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            event_data,
            room=f"deal_{room_code}",
        )

        for user_id in {buyer_id, seller_id}:
            socketio.emit(
                "user_data_changed",
                event_data,
                room=f"user_{user_id}",
            )

        return jsonify({
            "success": True,
            "message": message,
            **event_data,
        }), 201

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to request cancellation."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()

# ======================================================
# PARTNER CONFIRMS MUTUAL CANCELLATION
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/confirm-cancellation",
    methods=["POST"],
)
@login_required
def confirm_cancellation(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                r.room_id,
                r.status,
                r.current_step,
                r.payment_status,
                r.shipping_status,
                b.buyer_id,
                s.seller_id,
                e.status,
                c.requested_by,
                c.reason,
                c.buyer_confirmed,
                c.seller_confirmed,
                c.status,
                c.refund_amount,
                c.retained_fee
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_escrow e
                ON e.room_id = r.room_id
            JOIN deal_cancellation_request c
                ON c.room_id = r.room_id
            WHERE r.room_code = %s
            FOR UPDATE OF r, b, s, e, c
            """,
            (room_code,),
        )

        state = cursor.fetchone()

        if not state:
            return jsonify({
                "success": False,
                "message": (
                    "Cancellation request was not found."
                ),
            }), 404

        (
            room_id,
            room_status,
            current_step,
            payment_status,
            shipping_status,
            buyer_id,
            seller_id,
            escrow_status,
            requested_by,
            cancellation_reason,
            buyer_confirmed,
            seller_confirmed,
            cancellation_status,
            stored_refund_amount,
            stored_retained_fee,
        ) = state

        if authenticated_user_id not in {
            buyer_id,
            seller_id,
        }:
            return jsonify({
                "success": False,
                "message": (
                    "You are not assigned to this deal."
                ),
            }), 403

        if cancellation_status == "Processed":
            return jsonify({
                "success": True,
                "reused": True,
                "message": (
                    "Cancellation was already processed."
                ),
                "refund_amount": float(
                    stored_refund_amount
                ),
                "retained_fee": float(
                    stored_retained_fee
                ),
                "status": "Cancelled",
                "current_step": "Cancelled",
                "payment_status": "Refunded",
            }), 200

        if cancellation_status == "Rejected":
            return jsonify({
                "success": False,
                "message": (
                    "This cancellation request "
                    "was rejected."
                ),
            }), 409

        if (
            room_status in {"Completed", "Cancelled"}
            or current_step != "Delivery"
            or payment_status != "Paid"
            or escrow_status != "Held"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "This funded deal cannot currently "
                    "be cancelled."
                ),
            }), 409
        if (
            shipping_status
            and shipping_status != "NotShipped"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Cancellation cannot be processed after "
                    "fulfillment evidence is submitted."
                ),
            }), 409
        if authenticated_user_id == buyer_id:
            buyer_confirmed = True

            cursor.execute(
                """
                UPDATE deal_cancellation_request
                SET
                    buyer_confirmed = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE room_id = %s
                """,
                (room_id,),
            )
        else:
            seller_confirmed = True

            cursor.execute(
                """
                UPDATE deal_cancellation_request
                SET
                    seller_confirmed = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE room_id = %s
                """,
                (room_id,),
            )

        both_confirmed = bool(
            buyer_confirmed
            and seller_confirmed
        )

        if not both_confirmed:
            conn.commit()
            confirmer_role = (
                "Buyer"
                if authenticated_user_id == buyer_id
                else "Seller"
            )

            waiting_for = (
                "seller"
                if not seller_confirmed
                else "buyer"
            )

            message = (
                f"{confirmer_role} confirmed "
                f"cancellation. Waiting for the "
                f"{waiting_for}."
            )
            event_data = {
                "room_id": room_id,
                "room_code": room_code,
                "resource": "cancellation",
                "buyer_confirmed": bool(
                    buyer_confirmed
                ),
                "seller_confirmed": bool(
                    seller_confirmed
                ),
                "status": "Pending",
                "message": message,
            }

            socketio.emit(
                "cancellation_updated",
                event_data,
                room=f"deal_{room_code}",
            )

            for user_id in {buyer_id, seller_id}:
                socketio.emit(
                    "user_data_changed",
                    event_data,
                    room=f"user_{user_id}",
                )

            return jsonify({
                "success": True,
                "reused": (
                    authenticated_user_id
                    == requested_by
                ),
                "message": message,
                **event_data,
            }), 200

        refund_result = refund_escrow_to_buyer(
            cursor,
            room_id=room_id,
            room_code=room_code,
        )

        cursor.execute(
            """
            UPDATE deal_cancellation_request
            SET
                buyer_confirmed = TRUE,
                seller_confirmed = TRUE,
                status = 'Processed',
                refund_amount = %s,
                retained_fee = %s,
                processed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE room_id = %s
            """,
            (
                refund_result["refund_amount"],
                refund_result["retained_fee"],
                room_id,
            ),
        )

        cursor.execute(
            """
            UPDATE room
            SET
                status = 'Cancelled',
                current_step = 'Cancelled',
                payment_status = 'Refunded',
                cancel_requested_by = %s,
                cancel_reason = %s
            WHERE room_id = %s
            """,
            (
                requested_by,
                cancellation_reason,
                room_id,
            ),
        )

        conn.commit()
        message = (
            "Deal cancelled by mutual agreement. "
            f"Buyer wallet refund: "
            f"${refund_result['refund_amount']:.2f}. "
            f"Service fee retained: "
            f"${refund_result['retained_fee']:.2f}. "
            "Seller received: $0.00."
        )
        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "cancellation",
            "status": "Cancelled",
            "current_step": "Cancelled",
            "payment_status": "Refunded",
            "refund_amount": float(
                refund_result["refund_amount"]
            ),
            "retained_fee": float(
                refund_result["retained_fee"]
            ),
            "message": message,
        }

        socketio.emit(
            "deal_cancelled",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "cancellation_updated",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "wallet_updated",
            {
                **event_data,
                "resource": "wallet",
            },
            room=f"user_{buyer_id}",
        )

        for user_id in {buyer_id, seller_id}:
            socketio.emit(
                "user_data_changed",
                event_data,
                room=f"user_{user_id}",
            )

        return jsonify({
            "success": True,
            "reused": False,
            "message": message,
            "buyer": {
                "refund_amount": float(
                    refund_result["refund_amount"]
                ),
                "available_balance": float(
                    refund_result[
                        "available_balance"
                    ]
                ),
                "held_balance": float(
                    refund_result[
                        "pending_balance"
                    ]
                ),
            },
            "platform": {
                "retained_fee": float(
                    refund_result["retained_fee"]
                ),
            },
            **event_data,
        }), 200

    except WalletError as error:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(error),
        }), 409

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to confirm cancellation."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()

# ======================================================
# PARTNER REJECTS MUTUAL CANCELLATION
# ======================================================
@deal_bp.route(
    "/deals/<room_code>/reject-cancellation",
    methods=["POST"],
)
@login_required
def reject_cancellation(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                r.room_id,
                b.buyer_id,
                s.seller_id,
                c.requested_by,
                c.status
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_cancellation_request c
                ON c.room_id = r.room_id
            WHERE r.room_code = %s
            FOR UPDATE OF r, b, s, c
            """,
            (room_code,),
        )

        state = cursor.fetchone()

        if not state:
            return jsonify({
                "success": False,
                "message": (
                    "Cancellation request was not found."
                ),
            }), 404

        (
            room_id,
            buyer_id,
            seller_id,
            requested_by,
            cancellation_status,
        ) = state

        if authenticated_user_id not in {
            buyer_id,
            seller_id,
        }:
            return jsonify({
                "success": False,
                "message": (
                    "You are not assigned to this deal."
                ),
            }), 403

        if authenticated_user_id == requested_by:
            return jsonify({
                "success": False,
                "message": (
                    "The requester cannot reject their "
                    "own cancellation request."
                ),
            }), 409

        if cancellation_status == "Processed":
            return jsonify({
                "success": False,
                "message": (
                    "Processed cancellation cannot "
                    "be rejected."
                ),
            }), 409

        if cancellation_status == "Rejected":
            return jsonify({
                "success": True,
                "reused": True,
                "message": (
                    "Cancellation was already rejected."
                ),
            }), 200

        cursor.execute(
            """
            UPDATE deal_cancellation_request
            SET
                rejected_by = %s,
                status = 'Rejected',
                updated_at = CURRENT_TIMESTAMP
            WHERE room_id = %s
            """,
            (
                authenticated_user_id,
                room_id,
            ),
        )

        conn.commit()

        message = (
            "Cancellation request rejected. "
            "The deal remains active and escrow "
            "funds remain protected."
        )
        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "cancellation",
            "rejected_by": authenticated_user_id,
            "status": "Rejected",
            "message": message,
        }

        socketio.emit(
            "cancellation_rejected",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            event_data,
            room=f"deal_{room_code}",
        )

        for user_id in {buyer_id, seller_id}:
            socketio.emit(
                "user_data_changed",
                event_data,
                room=f"user_{user_id}",
            )

        return jsonify({
            "success": True,
            "reused": False,
            **event_data,
        }), 200

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to reject cancellation."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()
