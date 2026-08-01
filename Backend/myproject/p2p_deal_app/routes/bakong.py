import traceback
from datetime import datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, g, jsonify

from database import get_db
from services.auth_required import login_required
from services.bakong_service import (
    BakongServiceError,
    generate_qr,
    verification_is_configured,
    verify_transaction_by_md5,
)
from socketio_instance import socketio
bakong_bp = Blueprint("bakong", __name__)


def parse_expiration(value):
    if not value:
        raise BakongServiceError(
            "Bakong service did not return an expiration time."
        )

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
    except (TypeError, ValueError) as error:
        raise BakongServiceError(
            "Bakong service returned an invalid expiration time."
        ) from error


@bakong_bp.route(
    "/payment/<room_code>/qr",
    methods=["POST"],
)
@login_required
def generate_payment_qr(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
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
            FOR UPDATE OF r
        """, (room_code,))

        deal = cur.fetchone()

        if not deal:
            return jsonify({
                "success": False,
                "message": "Room not found.",
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
            buyer_confirmed,
            seller_confirmed,
        ) = deal

        if str(authenticated_user_id) != str(buyer_id):
            return jsonify({
                "success": False,
                "message": (
                    "Only the assigned buyer can generate "
                    "the payment QR."
                ),
            }), 403

        if current_step != "Payment":
            return jsonify({
                "success": False,
                "message": (
                    "This deal is not in the payment stage."
                ),
            }), 400

        if payment_status != "Waiting":
            return jsonify({
                "success": False,
                "message": (
                    "This deal is no longer waiting for payment."
                ),
            }), 400

        if (
            not fee_payer
            or fee_amount is None
            or buyer_deposit is None
            or not buyer_confirmed
            or not seller_confirmed
        ):
            return jsonify({
                "success": False,
                "message": (
                    "The fee agreement is not fully confirmed."
                ),
            }), 400

        if buyer_deposit <= 0:
            return jsonify({
                "success": False,
                "message": (
                    "The buyer deposit must be greater than zero."
                ),
            }), 400

        cur.execute("""
            UPDATE deal_payment_attempt
            SET status = 'Expired'
            WHERE room_id = %s
              AND status = 'Generated'
              AND expires_at <= CURRENT_TIMESTAMP
        """, (room_id,))

        cur.execute("""
            SELECT
                payment_attempt_id,
                qr_payload,
                expected_amount,
                currency,
                expires_at
            FROM deal_payment_attempt
            WHERE room_id = %s
              AND status = 'Generated'
              AND expires_at > CURRENT_TIMESTAMP
            ORDER BY created_at DESC
            LIMIT 1
        """, (room_id,))

        existing_attempt = cur.fetchone()

        if existing_attempt:
            (
                payment_attempt_id,
                qr_payload,
                expected_amount,
                currency,
                expires_at,
            ) = existing_attempt

            conn.commit()

            return jsonify({
                "success": True,
                "payment_attempt_id": payment_attempt_id,
                "room_code": room_code,
                "amount": float(expected_amount),
                "currency": currency,
                "qr": qr_payload,
                "expires_at": expires_at.isoformat(),
                "reused": True,
            }), 200

        result = generate_qr(
            amount=buyer_deposit,
            room_code=room_code,
        )

        expires_at = parse_expiration(
            result["expires_at"]
        )

        cur.execute("""
            INSERT INTO deal_payment_attempt (
                room_id,
                khqr_md5,
                qr_payload,
                expected_amount,
                currency,
                receiver_account,
                status,
                expires_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'Generated',
                %s
            )
            RETURNING payment_attempt_id
        """, (
            room_id,
            result["md5"],
            result["qr"],
            buyer_deposit,
            result["currency"],
            result["receiver_account"],
            expires_at,
        ))

        payment_attempt_id = cur.fetchone()[0]

        cur.execute("""
            UPDATE room
            SET
                bakong_transaction_id = %s,
                payment_provider = 'Bakong'
            WHERE room_id = %s
        """, (
            result["md5"],
            room_id,
        ))

        conn.commit()

        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "payment_qr",
            "payment_status": payment_status,
            "current_step": current_step,
        }

        socketio.emit(
            "payment_qr_generated",
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
            "payment_attempt_id": payment_attempt_id,
            "room_code": room_code,
            "amount": float(buyer_deposit),
            "currency": result["currency"],
            "qr": result["qr"],
            "expires_at": expires_at.isoformat(),
            "reused": False,
        }), 201

    except BakongServiceError as error:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(error),
        }), 502

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": "Unable to generate the payment QR.",
            "error": str(error),
        }), 500

    finally:
        cur.close()
        conn.close()
@bakong_bp.route(
    "/payment/<room_code>/verify",
    methods=["POST"],
)
@login_required
def verify_payment(room_code):
    authenticated_user_id = g.current_user_id

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                r.room_id,
                r.current_step,
                r.payment_status,
                b.buyer_id,
                s.seller_id
            FROM room r
            LEFT JOIN buyer b
                ON b.room_id = r.room_id
            LEFT JOIN seller s
                ON s.room_id = r.room_id
            WHERE r.room_code = %s
        """, (room_code,))

        deal = cur.fetchone()

        if not deal:
            return jsonify({
                "success": False,
                "message": "Room not found.",
            }), 404

        (
            room_id,
            current_step,
            payment_status,
            buyer_id,
            seller_id,
        ) = deal

        if str(authenticated_user_id) != str(buyer_id):
            return jsonify({
                "success": False,
                "message": (
                    "Only the assigned buyer can verify payment."
                ),
            }), 403

        if payment_status == "Paid":
            return jsonify({
                "success": True,
                "verified": True,
                "message": "Payment is already verified.",
                "current_step": current_step,
            }), 200

        if current_step != "Payment":
            return jsonify({
                "success": False,
                "message": (
                    "This deal is not in the payment stage."
                ),
            }), 400
        if not verification_is_configured():
         return jsonify({
        "success": False,
        "verified": False,
        "message": (
            "Bakong verification is not configured yet."
        ),
         }), 503

        cur.execute("""
            SELECT
                payment_attempt_id,
                khqr_md5,
                expected_amount,
                currency,
                receiver_account,
                status,
                expires_at,
                verification_attempts,
                EXTRACT(
                    EPOCH FROM (
                        CURRENT_TIMESTAMP -
                        last_verification_at
                    )
                )
            FROM deal_payment_attempt
            WHERE room_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
        """, (room_id,))

        attempt = cur.fetchone()

        if not attempt:
            return jsonify({
                "success": False,
                "message": (
                    "Generate a payment QR before verification."
                ),
            }), 400

        (
            payment_attempt_id,
            khqr_md5,
            expected_amount,
            expected_currency,
            expected_receiver,
            attempt_status,
            expires_at,
            verification_attempts,
            seconds_since_last_attempt,
        ) = attempt

        if attempt_status == "Verified":
            return jsonify({
                "success": True,
                "verified": True,
                "message": "Payment is already verified.",
                "current_step": "Delivery",
            }), 200

        cur.execute(
            "SELECT CURRENT_TIMESTAMP >= %s",
            (expires_at,),
        )
        qr_expired = cur.fetchone()[0]

        if qr_expired:
            cur.execute("""
                UPDATE deal_payment_attempt
                SET status = 'Expired'
                WHERE payment_attempt_id = %s
            """, (payment_attempt_id,))

            conn.commit()

            return jsonify({
                "success": False,
                "verified": False,
                "message": (
                    "The payment QR has expired. "
                    "Generate a new QR."
                ),
            }), 400

        if attempt_status != "Generated":
            return jsonify({
                "success": False,
                "verified": False,
                "message": (
                    "This payment attempt cannot be verified."
                ),
            }), 400

        if verification_attempts >= 3:
            return jsonify({
                "success": False,
                "verified": False,
                "message": (
                    "Maximum verification attempts reached "
                    "for this QR."
                ),
            }), 429

        if (
            seconds_since_last_attempt is not None
            and seconds_since_last_attempt < 60
        ):
            retry_after = max(
                1,
                60 - int(seconds_since_last_attempt),
            )

            return jsonify({
                "success": False,
                "verified": False,
                "message": (
                    "Please wait before checking payment again."
                ),
                "retry_after": retry_after,
            }), 429

        # Save the attempt before contacting Bakong. If the
        # request times out, it may still have consumed quota.
        cur.execute("""
            UPDATE deal_payment_attempt
            SET
                verification_attempts =
                    verification_attempts + 1,
                last_verification_at = CURRENT_TIMESTAMP
            WHERE payment_attempt_id = %s
        """, (payment_attempt_id,))

        conn.commit()

        verification = verify_transaction_by_md5(
            khqr_md5
        )

        if not verification["verified"]:
            return jsonify({
                "success": True,
                "verified": False,
                "message": (
                    "Payment was not found yet. "
                    "Confirm the transfer and try again later."
                ),
                "verification_attempts": (
                    verification_attempts + 1
                ),
            }), 200

        transaction = verification["transaction"]

        try:
            received_amount = Decimal(
                str(transaction.get("amount"))
            )
        except (InvalidOperation, TypeError) as error:
            raise BakongServiceError(
                "Bakong returned an invalid payment amount."
            ) from error

        received_currency = str(
            transaction.get("currency", "")
        ).strip().upper()

        received_account = str(
            transaction.get("toAccountId", "")
        ).strip()

        expected_amount = Decimal(expected_amount)

        payment_matches = (
            received_amount == expected_amount
            and received_currency
            == str(expected_currency).upper()
            and received_account.casefold()
            == str(expected_receiver).strip().casefold()
        )

        if not payment_matches:
            cur.execute("""
                UPDATE deal_payment_attempt
                SET status = 'Failed'
                WHERE payment_attempt_id = %s
            """, (payment_attempt_id,))

            conn.commit()

            return jsonify({
                "success": False,
                "verified": False,
                "message": (
                    "The transaction does not match the "
                    "expected amount, currency, or receiver."
                ),
            }), 409

        cur.execute("""
            UPDATE deal_payment_attempt
            SET
                status = 'Verified',
                verified_at = CURRENT_TIMESTAMP
            WHERE payment_attempt_id = %s
        """, (payment_attempt_id,))

        cur.execute("""
            UPDATE room
            SET
                payment_status = 'Paid',
                payment_verified_at = CURRENT_TIMESTAMP,
                current_step = 'Delivery',
                bakong_transaction_id = %s,
                payment_provider = 'Bakong'
            WHERE room_id = %s
              AND current_step = 'Payment'
              AND payment_status = 'Waiting'
        """, (
            khqr_md5,
            room_id,
        ))

        conn.commit()

        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "resource": "payment",
            "payment_status": "Paid",
            "current_step": "Delivery",
        }

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
            "verified": True,
            "message": "Payment verified successfully.",
            "payment_status": "Paid",
            "current_step": "Delivery",
        }), 200

    except BakongServiceError as error:
        conn.rollback()

        return jsonify({
            "success": False,
            "verified": False,
            "message": str(error),
        }), 502

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "verified": False,
            "message": "Unable to verify payment.",
            "error": str(error),
        }), 500

    finally:
        cur.close()
        conn.close()