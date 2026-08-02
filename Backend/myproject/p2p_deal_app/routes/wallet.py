import traceback
from uuid import uuid4
from flask import (
    Blueprint,
    g,
    jsonify,
    request,
)
from config import Config

from database import get_db
from services.auth_required import login_required
from services.wallet_service import (
    WalletError,
    credit_wallet_deposit,
    get_or_create_locked_wallet,
    hold_wallet_funds,

)
from socketio_instance import socketio


wallet_bp = Blueprint("wallet", __name__)


@wallet_bp.route("/wallet", methods=["GET"])
@login_required
def get_my_wallet():
    user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        wallet = get_or_create_locked_wallet(
            cursor,
            user_id,
        )

        conn.commit()

        return jsonify({
            "success": True,
            "wallet": {
                "available_balance": float(
                    wallet["available_balance"]
                ),
                "held_balance": float(
                    wallet["pending_balance"]
                ),
                "total_received": float(
                    wallet["total_received"]
                ),
                "total_withdrawn": float(
                    wallet["total_withdrawn"]
                ),
            },
        }), 200

    except WalletError as error:
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
            "message": "Unable to load wallet.",
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()





@wallet_bp.route(
    "/wallet/demo-deposit",
    methods=["POST"],
)
@login_required
def create_demo_deposit():
    """
    Simulate a wallet deposit for university demonstrations.

    This endpoint must never operate when real Bakong
    verification mode is enabled.
    """
    if Config.PAYMENT_VERIFICATION_MODE != "mock":
        return jsonify({
            "success": False,
            "message": (
                "Demo deposits are disabled when real "
                "payment verification is enabled."
            ),
        }), 403

    data = request.get_json(silent=True) or {}
    amount = data.get("amount")

    if amount is None:
        return jsonify({
            "success": False,
            "message": "Deposit amount is required.",
        }), 400

    user_id = g.current_user_id

    # Every simulated deposit receives a unique reference.
    # The ledger constraint prevents it from being reused.
    reference_key = (
        f"demo-deposit:{user_id}:{uuid4().hex}"
    )

    conn = get_db()
    cursor = conn.cursor()

    try:
        deposit = credit_wallet_deposit(
            cursor,
            user_id=user_id,
            amount=amount,
            reference_key=reference_key,
            description=(
                "Simulated wallet deposit for "
                "university demonstration."
            ),
        )

        conn.commit()

        event_data = {
            "resource": "wallet",
            "operation": "Deposit",
            "amount": float(deposit["amount"]),
        }

        socketio.emit(
            "wallet_updated",
            event_data,
            room=f"user_{user_id}",
        )

        socketio.emit(
            "user_data_changed",
            event_data,
            room=f"user_{user_id}",
        )

        return jsonify({
            "success": True,
            "demo": True,
            "message": (
                "Demo funds were added to the wallet."
            ),
            "deposit": {
                "amount": float(deposit["amount"]),
                "available_balance": float(
                    deposit["available_balance"]
                ),
                "held_balance": float(
                    deposit["pending_balance"]
                ),
                "reference": reference_key,
            },
        }), 201

    except WalletError as error:
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
            "message": (
                "Unable to create the demo deposit."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()




@wallet_bp.route(
    "/deals/<room_code>/pay-with-wallet",
    methods=["POST"],
)
@login_required
def pay_deal_with_wallet(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Lock the complete confirmed deal configuration.
        cursor.execute(
            """
            SELECT
                r.room_id,
                r.status,
                r.current_step,
                r.payment_status,
                b.buyer_id,
                s.seller_id,
                f.fee_payer,
                f.fee_amount,
                f.buyer_deposit,
                f.seller_receive,
                f.buyer_confirmed,
                f.seller_confirmed
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_fee_agreement f
                ON f.room_id = r.room_id
            WHERE r.room_code = %s
            FOR UPDATE OF r, b, s, f
            """,
            (room_code,),
        )

        deal = cursor.fetchone()

        if not deal:
            return jsonify({
                "success": False,
                "message": (
                    "Deal or confirmed fee agreement "
                    "was not found."
                ),
            }), 404

        (
            room_id,
            room_status,
            current_step,
            payment_status,
            buyer_id,
            seller_id,
            fee_payer,
            fee_amount,
            buyer_deposit,
            seller_receive,
            buyer_confirmed,
            seller_confirmed,
        ) = deal

        if authenticated_user_id != buyer_id:
            return jsonify({
                "success": False,
                "message": (
                    "Only the assigned buyer can choose "
                    "the payment method."
                ),
            }), 403

        if room_status in ("Completed", "Cancelled"):
            return jsonify({
                "success": False,
                "message": (
                    "This deal is already finished."
                ),
            }), 409

        # A repeated request after successful payment
        # should return success instead of charging twice.
        if payment_status == "Paid":
            cursor.execute(
                """
                SELECT
                    payment_method,
                    held_amount,
                    status
                FROM deal_escrow
                WHERE room_id = %s
                """,
                (room_id,),
            )

            existing_escrow = cursor.fetchone()

            if (
                existing_escrow
                and existing_escrow[0] == "Wallet"
                and existing_escrow[2] == "Held"
            ):
                return jsonify({
                    "success": True,
                    "reused": True,
                    "message": (
                        "This deal is already funded "
                        "from the wallet."
                    ),
                    "payment_method": "Wallet",
                    "held_amount": float(
                        existing_escrow[1]
                    ),
                    "payment_status": "Paid",
                    "current_step": current_step,
                }), 200

            return jsonify({
                "success": False,
                "message": (
                    "This deal has already been funded "
                    "using another payment method."
                ),
            }), 409

        if current_step != "Payment":
            return jsonify({
                "success": False,
                "message": (
                    "The deal is not in the payment stage."
                ),
            }), 409

        if payment_status != "Waiting":
            return jsonify({
                "success": False,
                "message": (
                    "This deal is not waiting for payment."
                ),
            }), 409

        if not buyer_confirmed or not seller_confirmed:
            return jsonify({
                "success": False,
                "message": (
                    "Both users must confirm the fee "
                    "agreement first."
                ),
            }), 409

        if not fee_payer:
            return jsonify({
                "success": False,
                "message": (
                    "The fee payer has not been selected."
                ),
            }), 409

        if (
            buyer_deposit is None
            or seller_receive is None
            or fee_amount is None
        ):
            return jsonify({
                "success": False,
                "message": (
                    "The confirmed payment totals "
                    "are incomplete."
                ),
            }), 409

        wallet_result = hold_wallet_funds(
            cursor,
            room_id=room_id,
            room_code=room_code,
            buyer_id=buyer_id,
            seller_id=seller_id,
            held_amount=buyer_deposit,
            fee_amount=fee_amount,
            seller_receive=seller_receive,
        )

        cursor.execute(
            """
            UPDATE room
            SET
                payment_status = 'Paid',
                payment_verified_at =
                    CURRENT_TIMESTAMP,
                payment_provider = 'Wallet',
                total_paid = %s,
                current_step = 'Delivery'
            WHERE room_id = %s
              AND payment_status = 'Waiting'
              AND current_step = 'Payment'
            """,
            (
                buyer_deposit,
                room_id,
            ),
        )

        if cursor.rowcount != 1:
            raise WalletError(
                "The deal payment state changed. "
                "Please reload and try again."
            )

        conn.commit()

        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "payment",
            "payment_method": "Wallet",
            "payment_status": "Paid",
            "current_step": "Delivery",
        }

        # Notify both clients in the deal room.
        socketio.emit(
            "payment_verified",
            event_data,
            room=f"deal_{room_code}",
        )

        socketio.emit(
            "room_updated",
            event_data,
            room=f"deal_{room_code}",
        )

        # Tell the buyer to reload their wallet.
        socketio.emit(
            "wallet_updated",
            {
                **event_data,
                "resource": "wallet",
            },
            room=f"user_{buyer_id}",
        )

        socketio.emit(
            "user_data_changed",
            {
                **event_data,
                "resource": "wallet",
            },
            room=f"user_{buyer_id}",
        )

        # Tell the seller their open deal changed.
        socketio.emit(
            "user_data_changed",
            event_data,
            room=f"user_{seller_id}",
        )

        return jsonify({
            "success": True,
            "reused": wallet_result["reused"],
            "message": (
                "Wallet funds are now held "
                "for this deal."
            ),
            "payment_method": "Wallet",
            "held_amount": float(
                wallet_result["held_amount"]
            ),
            "available_balance": float(
                wallet_result["available_balance"]
            ),
            "held_balance": float(
                wallet_result["pending_balance"]
            ),
            "payment_status": "Paid",
            "current_step": "Delivery",
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
                "Unable to fund the deal "
                "from the wallet."
            ),
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        conn.close()