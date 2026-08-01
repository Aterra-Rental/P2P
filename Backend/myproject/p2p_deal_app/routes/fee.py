import traceback

from flask import Blueprint, jsonify, request

from database import get_db
from socketio_instance import socketio

fee_bp = Blueprint("fee", __name__)


# ======================================================
# GET CURRENT FEE AGREEMENT
# ======================================================
@fee_bp.route("/deals/<room_code>/fee", methods=["GET"])
def get_fee_agreement(room_code):
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
                r.agreed_price,
                r.status,
                r.current_step,
                b.buyer_id,
                s.seller_id,
                f.fee_payer,
                f.proposed_by,
                f.fee_amount,
                f.buyer_deposit,
                f.seller_receive,
                f.buyer_confirmed,
                f.seller_confirmed
            FROM room r
            LEFT JOIN buyer b
                ON b.room_id = r.room_id
            LEFT JOIN seller s
                ON s.room_id = r.room_id
            LEFT JOIN deal_fee_agreement f
                ON f.room_id = r.room_id
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
            current_amount,
            room_status,
            current_step,
            buyer_id,
            seller_id,
            fee_payer,
            proposed_by,
            fee_amount,
            buyer_deposit,
            seller_receive,
            buyer_confirmed,
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

        if not buyer_id or not seller_id:
            return jsonify({
                "success": False,
                "message": "Deal roles have not been assigned."
            }), 400

        if fee_amount is None:
            return jsonify({
                "success": False,
                "message": "Fee agreement has not been created."
            }), 404

        if str(user_id) == str(buyer_id):
            my_role = "buyer"
            my_fee_confirmed = bool(buyer_confirmed)
        elif str(user_id) == str(seller_id):
            my_role = "seller"
            my_fee_confirmed = bool(seller_confirmed)
        else:
            return jsonify({
                "success": False,
                "message": "You are not assigned to this deal."
            }), 403

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
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "fee_payer": fee_payer,
            "proposed_by_user_id": proposed_by,
            "fee_amount": float(fee_amount),
            "buyer_deposit": (
                float(buyer_deposit)
                if buyer_deposit is not None
                else None
            ),
            "seller_receive": (
                float(seller_receive)
                if seller_receive is not None
                else None
            ),
            "buyer_fee_confirmed": bool(buyer_confirmed),
            "seller_fee_confirmed": bool(seller_confirmed),
            "both_fee_confirmed": bool(
                buyer_confirmed and seller_confirmed
            ),
            "my_role": my_role,
            "my_fee_confirmed": my_fee_confirmed,
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
# PROPOSE WHO PAYS THE SERVICE FEE
# ======================================================
@fee_bp.route(
    "/deals/<room_code>/propose-fee-payer",
    methods=["POST"],
)
def propose_fee_payer(room_code):
    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    fee_payer = str(data.get("fee_payer", "")).lower()

    if not user_id or fee_payer not in ["buyer", "seller"]:
        return jsonify({
            "success": False,
            "message": (
                "User ID and a valid fee payer are required."
            ),
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
            current_amount,
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

        if current_step != "FeeConfirmation":
            return jsonify({
                "success": False,
                "message": (
                    "This room is not in fee confirmation."
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
            buyer_confirmed = True
            seller_confirmed = False
        elif str(user_id) == str(seller_id):
            proposer_role = "seller"
            buyer_confirmed = False
            seller_confirmed = True
        else:
            return jsonify({
                "success": False,
                "message": "You are not assigned to this deal."
            }), 403

        cur.execute("""
            SELECT fee_amount
            FROM deal_fee_agreement
            WHERE room_id = %s
            FOR UPDATE
        """, (room_id,))
        fee_row = cur.fetchone()

        if not fee_row:
            return jsonify({
                "success": False,
                "message": "Fee agreement has not been created."
            }), 404

        fee_amount = fee_row[0]

        if current_amount is None:
            return jsonify({
                "success": False,
                "message": "The deal amount is missing."
            }), 400

        if fee_payer == "buyer":
            buyer_deposit = current_amount + fee_amount
            seller_receive = current_amount
        else:
            buyer_deposit = current_amount
            seller_receive = current_amount - fee_amount

        if seller_receive < 0:
            return jsonify({
                "success": False,
                "message": (
                    "The service fee cannot exceed the deal amount."
                ),
            }), 400

        cur.execute("""
            UPDATE deal_fee_agreement
            SET
                fee_payer = %s,
                proposed_by = %s,
                buyer_deposit = %s,
                seller_receive = %s,
                buyer_confirmed = %s,
                seller_confirmed = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE room_id = %s
        """, (
            fee_payer,
            user_id,
            buyer_deposit,
            seller_receive,
            buyer_confirmed,
            seller_confirmed,
            room_id,
        ))

        conn.commit()

        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "current_amount": float(current_amount),
            "fee_payer": fee_payer,
            "proposed_by_user_id": int(user_id),
            "proposed_by_role": proposer_role,
            "fee_amount": float(fee_amount),
            "buyer_deposit": float(buyer_deposit),
            "seller_receive": float(seller_receive),
            "buyer_fee_confirmed": buyer_confirmed,
            "seller_fee_confirmed": seller_confirmed,
            "both_fee_confirmed": False,
            "status": room_status,
            "current_step": "FeeConfirmation",
        }

        socketio.emit(
            "fee_payer_proposed",
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
            "resource": "fee",
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
            "message": "Fee payer proposal saved.",
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
# CONFIRM THE CURRENT FEE AGREEMENT
# ======================================================
@fee_bp.route(
    "/deals/<room_code>/confirm-fee",
    methods=["POST"],
)
def confirm_fee_agreement(room_code):
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
                agreed_price,
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
            current_amount,
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

        if current_step != "FeeConfirmation":
            return jsonify({
                "success": False,
                "message": (
                    "This room is not in fee confirmation."
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
            confirmer_role = "buyer"
            confirmation_column = "buyer_confirmed"
        elif str(user_id) == str(seller_id):
            confirmer_role = "seller"
            confirmation_column = "seller_confirmed"
        else:
            return jsonify({
                "success": False,
                "message": "You are not assigned to this deal."
            }), 403

        cur.execute("""
            SELECT
                fee_payer,
                proposed_by,
                fee_amount,
                buyer_deposit,
                seller_receive,
                buyer_confirmed,
                seller_confirmed
            FROM deal_fee_agreement
            WHERE room_id = %s
            FOR UPDATE
        """, (room_id,))

        fee_row = cur.fetchone()

        if not fee_row:
            return jsonify({
                "success": False,
                "message": "Fee agreement has not been created."
            }), 404

        (
            fee_payer,
            proposed_by,
            fee_amount,
            buyer_deposit,
            seller_receive,
            buyer_confirmed,
            seller_confirmed,
        ) = fee_row

        if not fee_payer:
            return jsonify({
                "success": False,
                "message": "No fee payer has been proposed."
            }), 400

        if buyer_deposit is None or seller_receive is None:
            return jsonify({
                "success": False,
                "message": "Fee totals have not been calculated."
            }), 400

        # The column name is selected only from the fixed values above.
        cur.execute(f"""
            UPDATE deal_fee_agreement
            SET
                {confirmation_column} = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE room_id = %s
        """, (room_id,))

        cur.execute("""
            SELECT
                buyer_confirmed,
                seller_confirmed
            FROM deal_fee_agreement
            WHERE room_id = %s
        """, (room_id,))

        buyer_confirmed, seller_confirmed = cur.fetchone()

        both_confirmed = bool(
            buyer_confirmed and seller_confirmed
        )

        if both_confirmed:
            cur.execute("""
                UPDATE room
                SET
                    current_step = 'Payment',
                    escrow_fee = %s,
                    total_paid = %s
                WHERE room_id = %s
            """, (
                fee_amount,
                buyer_deposit,
                room_id,
            ))

        conn.commit()

        socket_data = {
            "room_id": room_id,
            "room_code": room_code,
            "current_amount": float(current_amount),
            "fee_payer": fee_payer,
            "proposed_by_user_id": proposed_by,
            "fee_amount": float(fee_amount),
            "buyer_deposit": float(buyer_deposit),
            "seller_receive": float(seller_receive),
            "buyer_fee_confirmed": bool(buyer_confirmed),
            "seller_fee_confirmed": bool(seller_confirmed),
            "both_fee_confirmed": both_confirmed,
            "confirmed_by_user_id": int(user_id),
            "confirmed_by_role": confirmer_role,
            "status": room_status,
            "current_step": (
                "Payment"
                if both_confirmed
                else "FeeConfirmation"
            ),
        }

        socketio.emit(
            (
                "fee_confirmed"
                if both_confirmed
                else "fee_confirmation_updated"
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
            "resource": "fee",
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
                "Both users confirmed the fee arrangement."
                if both_confirmed
                else "Fee confirmation saved."
            ),
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