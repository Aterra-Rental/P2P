import traceback

from flask import Blueprint, g, jsonify, request

from database import get_db
from services.auth_required import login_required
from services.notification_service import (
    create_user_notification,
    emit_notifications_changed,
)
from socketio_instance import socketio


dispute_bp = Blueprint("dispute", __name__)

ALLOWED_REQUESTED_RESOLUTIONS = {
    "ReleaseToSeller",
    "RefundBuyer",
}


def serialize_dispute(row):
    if not row:
        return None

    return {
        "dispute_id": row[0],
        "opened_by": row[1],
        "against_user": row[2],
        "dispute_type": row[3],
        "requested_resolution": row[4],
        "status": row[5],
        "reason": row[6],
        "created_at": (
            row[7].isoformat()
            if row[7]
            else None
        ),
        "updated_at": (
            row[8].isoformat()
            if row[8]
            else None
        ),
        "closed_at": (
            row[9].isoformat()
            if row[9]
            else None
        ),
        "resolution": (
            {
                "resolution_id": row[10],
                "resolved_by": row[11],
                "decision": row[12],
                "refund_amount": float(row[13]),
                "winner_user": row[14],
                "resolution_note": row[15],
                "resolved_at": (
                    row[16].isoformat()
                    if row[16]
                    else None
                ),
                "seller_release_amount": float(row[17]),
                "retained_fee": float(row[18]),
            }
            if row[10] is not None
            else None
        ),
    }


def emit_dispute_change(
    *,
    room_id,
    room_code,
    participant_ids,
    event_name,
    dispute_id,
):
    event_data = {
        "room_id": room_id,
        "room_code": room_code,
        "dispute_id": dispute_id,
        "resource": "dispute",
    }

    socketio.emit(
        event_name,
        event_data,
        room=f"deal_{room_code}",
    )

    socketio.emit(
        "deal_data_changed",
        event_data,
        room=f"deal_{room_code}",
    )

    socketio.emit(
        "room_updated",
        event_data,
        room=f"deal_{room_code}",
    )

    for participant_id in set(participant_ids):
        socketio.emit(
            "user_data_changed",
            event_data,
            room=f"user_{participant_id}",
        )
    socketio.emit(
        "admin_disputes_changed",
        event_data,
        room="admins",
    )
@dispute_bp.route(
    "/deals/<room_code>/dispute",
    methods=["GET"],
)
@login_required
def get_dispute(room_code):
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
                e.status
            FROM room r
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            LEFT JOIN deal_escrow e
                ON e.room_id = r.room_id
            WHERE r.room_code = %s
            """,
            (room_code,),
        )

        room_state = cursor.fetchone()

        if not room_state:
            return jsonify({
                "success": False,
                "message": "Deal was not found.",
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
        ) = room_state

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

        cursor.execute(
            """
            SELECT
                d.dispute_id,
                d.opened_by,
                d.against_user,
                d.dispute_type,
                d.requested_resolution,
                d.status,
                d.reason,
                d.created_at,
                d.updated_at,
                d.closed_at,
                dr.resolution_id,
                dr.resolved_by,
                dr.decision,
                dr.refund_amount,
                dr.winner_user,
                dr.resolution_note,
                dr.resolved_at,
                dr.seller_release_amount,
                dr.retained_fee
            FROM disputes d
            LEFT JOIN dispute_resolution dr
                ON dr.dispute_id = d.dispute_id
            WHERE d.room_id = %s
            ORDER BY
                d.created_at DESC,
                d.dispute_id DESC
            LIMIT 1
            """,
            (room_id,),
        )

        dispute = serialize_dispute(
            cursor.fetchone()
        )

        can_open_dispute = (
            room_status not in {
                "Completed",
                "Cancelled",
            }
            and current_step == "Delivery"
            and payment_status == "Paid"
            and escrow_status == "Held"
            and (
                dispute is None
                or dispute["status"] in {
                    "Resolved",
                    "Rejected",
                }
            )
        )

        return jsonify({
            "success": True,
            "room_id": room_id,
            "room_code": room_code,
            "room_status": room_status,
            "current_step": current_step,
            "payment_status": payment_status,
            "shipping_status": shipping_status,
            "escrow_status": escrow_status,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "my_role": (
                "buyer"
                if authenticated_user_id == buyer_id
                else "seller"
            ),
            "can_open_dispute": can_open_dispute,
            "dispute": dispute,
        }), 200

    except Exception:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load dispute information."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()


@dispute_bp.route(
    "/deals/<room_code>/dispute",
    methods=["POST"],
)
@login_required
def open_dispute(room_code):
    authenticated_user_id = g.current_user_id
    data = request.get_json(silent=True) or {}

    reason = str(
        data.get("reason", "")
    ).strip()

    requested_resolution = str(
        data.get("requested_resolution", "")
    ).strip()

    if len(reason) < 10:
        return jsonify({
            "success": False,
            "message": (
                "Dispute reason must contain at least "
                "10 characters."
            ),
        }), 400

    if len(reason) > 2000:
        return jsonify({
            "success": False,
            "message": (
                "Dispute reason cannot exceed "
                "2,000 characters."
            ),
        }), 400

    if (
        requested_resolution
        not in ALLOWED_REQUESTED_RESOLUTIONS
    ):
        return jsonify({
            "success": False,
            "message": (
                "Requested resolution must be "
                "ReleaseToSeller or RefundBuyer."
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
            FOR UPDATE OF r, e
            """,
            (room_code,),
        )

        room_state = cursor.fetchone()

        if not room_state:
            return jsonify({
                "success": False,
                "message": (
                    "A funded deal was not found."
                ),
            }), 404

        (
            room_id,
            room_status,
            current_step,
            payment_status,
            buyer_id,
            seller_id,
            escrow_status,
        ) = room_state

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

        allowed_requested_resolution = (
            "RefundBuyer"
            if authenticated_user_id == buyer_id
            else "ReleaseToSeller"
        )

        if (
            requested_resolution
            != allowed_requested_resolution
        ):
            role_message = (
                "Buyers may only request a refund."
                if authenticated_user_id == buyer_id
                else (
                    "Sellers may only request release "
                    "of the protected payment."
                )
            )

            return jsonify({
                "success": False,
                "message": role_message,
            }), 403

        if room_status in {
            "Completed",
            "Cancelled",
        }:
            return jsonify({
                "success": False,
                "message": (
                    "A finished deal cannot be disputed."
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

        cancellation = cursor.fetchone()

        if (
            cancellation
            and cancellation[0] == "Pending"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Respond to the pending cancellation "
                    "request before opening a dispute."
                ),
            }), 409

        cursor.execute(
            """
            SELECT dispute_id, status
            FROM disputes
            WHERE room_id = %s
              AND status IN (
                  'Open',
                  'UnderReview'
              )
            ORDER BY dispute_id DESC
            LIMIT 1
            FOR UPDATE
            """,
            (room_id,),
        )

        active_dispute = cursor.fetchone()

        if active_dispute:
            return jsonify({
                "success": True,
                "message": (
                    "This deal already has an active "
                    "dispute."
                ),
                "dispute_id": active_dispute[0],
                "status": active_dispute[1],
                "reused": True,
            }), 200

        if (
            current_step != "Delivery"
            or payment_status != "Paid"
            or escrow_status != "Held"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "A dispute can only be opened while "
                    "funds are held in escrow during the "
                    "delivery stage."
                ),
            }), 409

        against_user = (
            seller_id
            if authenticated_user_id == buyer_id
            else buyer_id
        )

        cursor.execute(
            """
            INSERT INTO disputes (
                room_id,
                opened_by,
                against_user,
                dispute_type,
                buyer_choice,
                status,
                reason,
                requested_resolution,
                created_at,
                updated_at,
                closed_at
            )
            VALUES (
                %s,
                %s,
                %s,
                'EscrowResolution',
                NULL,
                'Open',
                %s,
                %s,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                NULL
            )
            RETURNING dispute_id
            """,
            (
                room_id,
                authenticated_user_id,
                against_user,
                reason,
                requested_resolution,
            ),
        )

        dispute_id = cursor.fetchone()[0]

        cursor.execute(
            """
            UPDATE room
            SET current_step = 'Dispute'
            WHERE room_id = %s
            """,
            (room_id,),
        )

        cursor.execute(
            """
            UPDATE deal_escrow
            SET
                status = 'Disputed',
                updated_at = CURRENT_TIMESTAMP
            WHERE room_id = %s
              AND status = 'Held'
            """,
            (room_id,),
        )

        if cursor.rowcount != 1:
            raise RuntimeError(
                "Escrow could not be locked for review."
            )

        notification_message = (
            f"Your partner opened a dispute for room "
            f"{room_code}. The escrow funds remain locked "
            "while an administrator reviews the deal."
        )

        create_user_notification(
            cursor,
            user_id=against_user,
            actor_user_id=authenticated_user_id,
            notification_type="DisputeOpened",
            title="Deal dispute opened",
            message=notification_message,
            room_id=room_id,
            room_code=room_code,
        )

        conn.commit()

        emit_dispute_change(
            room_id=room_id,
            room_code=room_code,
            participant_ids={
                buyer_id,
                seller_id,
            },
            event_name="dispute_opened",
            dispute_id=dispute_id,
        )

        emit_notifications_changed({
            against_user,
        })

        return jsonify({
            "success": True,
            "message": (
                "Dispute opened successfully. Escrow "
                "funds are locked while an administrator "
                "reviews the deal."
            ),
            "room_id": room_id,
            "room_code": room_code,
            "dispute_id": dispute_id,
            "status": "Open",
            "current_step": "Dispute",
            "escrow_status": "Disputed",
            "requested_resolution": (
                requested_resolution
            ),
            "reused": False,
        }), 201

    except Exception:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": "Unable to open this dispute.",
        }), 500

    finally:
        cursor.close()
        conn.close()