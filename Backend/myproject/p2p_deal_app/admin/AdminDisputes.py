import os
import traceback
from decimal import Decimal

from flask import (
    g,
    jsonify,
    request,
    send_file,
)

from admin import admin_bp
from database import get_db
from services.admin_required import admin_required
from services.notification_service import (
    create_user_notification,
    emit_notifications_changed,
)
from services.wallet_service import (
    WalletError,
    refund_escrow_to_buyer,
    release_escrow_to_seller,
)
from socketio_instance import socketio


ALLOWED_DISPUTE_STATUSES = {
    "Open",
    "UnderReview",
    "Resolved",
    "Rejected",
}

DEAL_PROOF_FOLDER = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "uploads",
    "deal_proofs",
)

def serialize_dispute_summary(row):
    return {
        "dispute_id": row[0],
        "room_id": row[1],
        "room_code": row[2],
        "item_name": row[3],
        "product_type": row[4],
        "opened_by": row[5],
        "against_user": row[6],
        "requested_resolution": row[7],
        "status": row[8],
        "reason": row[9],
        "created_at": (
            row[10].isoformat()
            if row[10]
            else None
        ),
        "updated_at": (
            row[11].isoformat()
            if row[11]
            else None
        ),
        "buyer": {
            "user_id": row[12],
            "name": row[13],
            "email": row[14],
        },
        "seller": {
            "user_id": row[15],
            "name": row[16],
            "email": row[17],
        },
        "escrow": {
            "status": row[18],
            "payment_method": row[19],
            "held_amount": float(row[20]),
            "fee_amount": float(row[21]),
            "seller_receive": float(row[22]),
        },
        "total_count": row[23],
    }


@admin_bp.route(
    "/disputes",
    methods=["GET"],
)
@admin_required
def get_admin_disputes():
    status = str(
        request.args.get("status", "Open")
    ).strip()

    if status != "All" and (
        status not in ALLOWED_DISPUTE_STATUSES
    ):
        return jsonify({
            "success": False,
            "message": (
                "Status must be All, Open, UnderReview, "
                "Resolved, or Rejected."
            ),
        }), 400

    try:
        page = max(
            1,
            int(request.args.get("page", 1)),
        )
        per_page = min(
            100,
            max(
                10,
                int(request.args.get("per_page", 25)),
            ),
        )
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": (
                "Page and per_page must be integers."
            ),
        }), 400

    offset = (page - 1) * per_page

    conn = get_db()
    cursor = conn.cursor()

    try:
        parameters = []

        status_condition = ""

        if status != "All":
            status_condition = "AND d.status = %s"
            parameters.append(status)

        parameters.extend([
            per_page,
            offset,
        ])

        cursor.execute(
            f"""
            SELECT
                d.dispute_id,
                r.room_id,
                r.room_code,
                r.item_name,
                r.product_type,
                d.opened_by,
                d.against_user,
                d.requested_resolution,
                d.status,
                d.reason,
                d.created_at,
                d.updated_at,
                b.buyer_id,
                COALESCE(
                    NULLIF(
                        TRIM(
                            COALESCE(
                                buyer_details.firstname,
                                ''
                            )
                            || ' '
                            || COALESCE(
                                buyer_details.lastname,
                                ''
                            )
                        ),
                        ''
                    ),
                    buyer_login.email,
                    'User #' || b.buyer_id
                ) AS buyer_name,
                buyer_login.email,
                s.seller_id,
                COALESCE(
                    NULLIF(
                        TRIM(
                            COALESCE(
                                seller_details.firstname,
                                ''
                            )
                            || ' '
                            || COALESCE(
                                seller_details.lastname,
                                ''
                            )
                        ),
                        ''
                    ),
                    seller_login.email,
                    'User #' || s.seller_id
                ) AS seller_name,
                seller_login.email,
                e.status,
                e.payment_method,
                e.held_amount,
                e.fee_amount,
                e.seller_receive,
                COUNT(*) OVER() AS total_count
            FROM disputes d
            JOIN room r
                ON r.room_id = d.room_id
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_escrow e
                ON e.room_id = r.room_id
            JOIN user_login buyer_login
                ON buyer_login.user_id = b.buyer_id
            JOIN user_login seller_login
                ON seller_login.user_id = s.seller_id
            LEFT JOIN user_details buyer_details
                ON buyer_details.user_id = b.buyer_id
            LEFT JOIN user_details seller_details
                ON seller_details.user_id = s.seller_id
            WHERE 1 = 1
              {status_condition}
            ORDER BY
                CASE d.status
                    WHEN 'Open' THEN 1
                    WHEN 'UnderReview' THEN 2
                    WHEN 'Resolved' THEN 3
                    ELSE 4
                END,
                d.created_at DESC,
                d.dispute_id DESC
            LIMIT %s
            OFFSET %s
            """,
            tuple(parameters),
        )

        rows = cursor.fetchall()

        disputes = [
            serialize_dispute_summary(row)
            for row in rows
        ]

        total_count = (
            rows[0][23]
            if rows
            else 0
        )

        return jsonify({
            "success": True,
            "status_filter": status,
            "disputes": disputes,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": (
                    (
                        total_count + per_page - 1
                    )
                    // per_page
                ),
            },
        }), 200

    except Exception:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load admin disputes."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()


@admin_bp.route(
    "/disputes/<int:dispute_id>",
    methods=["GET"],
)
@admin_required
def get_admin_dispute_detail(dispute_id):
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                d.dispute_id,
                d.room_id,
                r.room_code,
                r.item_name,
                r.item_description,
                r.product_type,
                r.status,
                r.current_step,
                r.payment_status,
                r.shipping_status,
                r.courier_name,
                r.tracking_number,
                d.opened_by,
                d.against_user,
                d.dispute_type,
                d.requested_resolution,
                d.status,
                d.reason,
                d.created_at,
                d.updated_at,
                d.closed_at,
                b.buyer_id,
                COALESCE(
                    NULLIF(
                        TRIM(
                            COALESCE(
                                buyer_details.firstname,
                                ''
                            )
                            || ' '
                            || COALESCE(
                                buyer_details.lastname,
                                ''
                            )
                        ),
                        ''
                    ),
                    buyer_login.email,
                    'User #' || b.buyer_id
                ),
                buyer_login.email,
                s.seller_id,
                COALESCE(
                    NULLIF(
                        TRIM(
                            COALESCE(
                                seller_details.firstname,
                                ''
                            )
                            || ' '
                            || COALESCE(
                                seller_details.lastname,
                                ''
                            )
                        ),
                        ''
                    ),
                    seller_login.email,
                    'User #' || s.seller_id
                ),
                seller_login.email,
                e.status,
                e.payment_method,
                e.held_amount,
                e.fee_amount,
                e.seller_receive,
                p.proof_id,
                p.description,
                p.courier_name,
                p.tracking_number,
                p.uploaded_at,
                p.reviewed,
                p.admin_note,
                dr.resolution_id,
                dr.resolved_by,
                dr.decision,
                dr.refund_amount,
                dr.seller_release_amount,
                dr.retained_fee,
                dr.winner_user,
                dr.resolution_note,
                dr.resolved_at
            FROM disputes d
            JOIN room r
                ON r.room_id = d.room_id
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_escrow e
                ON e.room_id = r.room_id
            JOIN user_login buyer_login
                ON buyer_login.user_id = b.buyer_id
            JOIN user_login seller_login
                ON seller_login.user_id = s.seller_id
            LEFT JOIN user_details buyer_details
                ON buyer_details.user_id = b.buyer_id
            LEFT JOIN user_details seller_details
                ON seller_details.user_id = s.seller_id
            LEFT JOIN deal_proofs p
                ON p.room_id = r.room_id
               AND p.proof_type = 'Fulfillment'
            LEFT JOIN dispute_resolution dr
                ON dr.dispute_id = d.dispute_id
            WHERE d.dispute_id = %s
            """,
            (dispute_id,),
        )

        row = cursor.fetchone()

        if not row:
            return jsonify({
                "success": False,
                "message": "Dispute was not found.",
            }), 404

        room_id = row[1]

        cursor.execute(
            """
            SELECT
                message_id,
                sender_id,
                message,
                created_at
            FROM room_messages
            WHERE room_id = %s
            ORDER BY
                created_at ASC,
                message_id ASC
            LIMIT 500
            """,
            (room_id,),
        )

        messages = [
            {
                "message_id": message[0],
                "sender_id": message[1],
                "message": message[2],
                "created_at": (
                    message[3].isoformat()
                    if message[3]
                    else None
                ),
            }
            for message in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "dispute": {
                "dispute_id": row[0],
                "room_id": row[1],
                "room_code": row[2],
                "item_name": row[3],
                "item_description": row[4],
                "product_type": row[5],
                "room_status": row[6],
                "current_step": row[7],
                "payment_status": row[8],
                "shipping_status": row[9],
                "courier_name": row[10],
                "tracking_number": row[11],
                "opened_by": row[12],
                "against_user": row[13],
                "dispute_type": row[14],
                "requested_resolution": row[15],
                "status": row[16],
                "reason": row[17],
                "created_at": (
                    row[18].isoformat()
                    if row[18]
                    else None
                ),
                "updated_at": (
                    row[19].isoformat()
                    if row[19]
                    else None
                ),
                "closed_at": (
                    row[20].isoformat()
                    if row[20]
                    else None
                ),
                "buyer": {
                    "user_id": row[21],
                    "name": row[22],
                    "email": row[23],
                },
                "seller": {
                    "user_id": row[24],
                    "name": row[25],
                    "email": row[26],
                },
                "escrow": {
                    "status": row[27],
                    "payment_method": row[28],
                    "held_amount": float(row[29]),
                    "fee_amount": float(row[30]),
                    "seller_receive": float(row[31]),
                },
                "fulfillment": (
                    {
                        "proof_id": row[32],
                        "description": row[33],
                        "courier_name": row[34],
                        "tracking_number": row[35],
                        "uploaded_at": (
                            row[36].isoformat()
                            if row[36]
                            else None
                        ),
                        "reviewed": bool(row[37]),
                        "admin_note": row[38],
                    }
                    if row[32] is not None
                    else None
                ),
                "resolution": (
                    {
                        "resolution_id": row[39],
                        "resolved_by": row[40],
                        "decision": row[41],
                        "refund_amount": float(row[42]),
                        "seller_release_amount": float(
                            row[43]
                        ),
                        "retained_fee": float(row[44]),
                        "winner_user": row[45],
                        "resolution_note": row[46],
                        "resolved_at": (
                            row[47].isoformat()
                            if row[47]
                            else None
                        ),
                    }
                    if row[39] is not None
                    else None
                ),
                "messages": messages,
            },
        }), 200

    except Exception:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load dispute details."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()

@admin_bp.route(
    "/disputes/<int:dispute_id>/resolve",
    methods=["POST"],
)
@admin_required
def resolve_admin_dispute(dispute_id):
    admin_id = g.current_admin_id
    data = request.get_json(silent=True) or {}

    decision = str(
        data.get("decision", "")
    ).strip()

    resolution_note = str(
        data.get("resolution_note", "")
    ).strip()

    allowed_decisions = {
        "ReleaseToSeller",
        "RefundBuyer",
        "RejectDispute",
    }

    if decision not in allowed_decisions:
        return jsonify({
            "success": False,
            "message": (
                "Decision must be ReleaseToSeller, "
                "RefundBuyer, or RejectDispute."
            ),
        }), 400

    if len(resolution_note) < 10:
        return jsonify({
            "success": False,
            "message": (
                "Resolution note must contain at least "
                "10 characters."
            ),
        }), 400

    if len(resolution_note) > 2000:
        return jsonify({
            "success": False,
            "message": (
                "Resolution note cannot exceed "
                "2,000 characters."
            ),
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                d.status,
                d.requested_resolution,
                r.room_id,
                r.room_code,
                r.status,
                r.current_step,
                r.payment_status,
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
                e.payment_method,
                p.file_path,
                p.uploaded_at,
                dr.resolution_id,
                dr.decision
            FROM disputes d
            JOIN room r
                ON r.room_id = d.room_id
            JOIN buyer b
                ON b.room_id = r.room_id
            JOIN seller s
                ON s.room_id = r.room_id
            JOIN deal_fee_agreement f
                ON f.room_id = r.room_id
            JOIN deal_escrow e
                ON e.room_id = r.room_id
            LEFT JOIN deal_proofs p
                ON p.room_id = r.room_id
               AND p.proof_type = 'Fulfillment'
            LEFT JOIN dispute_resolution dr
                ON dr.dispute_id = d.dispute_id
            WHERE d.dispute_id = %s
            FOR UPDATE OF d, r, b, s, f, e
            """,
            (dispute_id,),
        )

        state = cursor.fetchone()

        if not state:
            return jsonify({
                "success": False,
                "message": "Dispute was not found.",
            }), 404

        (
            dispute_status,
            requested_resolution,
            room_id,
            room_code,
            room_status,
            current_step,
            payment_status,
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
            payment_method,
            fulfillment_proof,
            fulfillment_uploaded_at,
            existing_resolution_id,
            existing_decision,
        ) = state

        if existing_resolution_id is not None:
            return jsonify({
                "success": True,
                "message": (
                    "This dispute was already resolved."
                ),
                "resolution_id": existing_resolution_id,
                "decision": existing_decision,
                "reused": True,
            }), 200

        if dispute_status not in {
            "Open",
            "UnderReview",
        }:
            return jsonify({
                "success": False,
                "message": (
                    "This dispute is no longer open."
                ),
            }), 409

        if (
            room_status in {
                "Completed",
                "Cancelled",
            }
            or current_step != "Dispute"
            or payment_status != "Paid"
            or escrow_status != "Disputed"
        ):
            return jsonify({
                "success": False,
                "message": (
                    "The room and escrow are not in a "
                    "resolvable dispute state."
                ),
            }), 409

        fee_amount = Decimal(fee_amount)
        held_amount = Decimal(held_amount)
        seller_receive = Decimal(seller_receive)

        refund_amount = Decimal("0.00")
        seller_release_amount = Decimal("0.00")
        retained_fee = Decimal("0.00")
        winner_user = None
        transaction_id = None

        if decision == "ReleaseToSeller":
            release_result = release_escrow_to_seller(
                cursor,
                room_id=room_id,
                room_code=room_code,
            )

            seller_release_amount = (
                release_result["seller_receive"]
            )
            retained_fee = release_result["fee_amount"]
            winner_user = seller_id

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

            if retained_fee > Decimal("0.00"):
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
                        retained_fee,
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

            dispute_terminal_status = "Resolved"
            user_message = (
                "An administrator reviewed the dispute "
                "and released the escrow funds to the "
                "seller."
            )

        elif decision == "RefundBuyer":
            refund_result = refund_escrow_to_buyer(
                cursor,
                room_id=room_id,
                room_code=room_code,
            )

            refund_amount = (
                refund_result["refund_amount"]
            )
            retained_fee = (
                refund_result["retained_fee"]
            )
            winner_user = buyer_id

            cursor.execute(
                """
                UPDATE room
                SET
                    status = 'Cancelled',
                    current_step = 'Cancelled',
                    payment_status = 'Refunded'
                WHERE room_id = %s
                """,
                (room_id,),
            )

            dispute_terminal_status = "Resolved"
            user_message = (
                "An administrator reviewed the dispute. "
                f"${refund_amount:.2f} was refunded to "
                "the buyer's wallet and "
                f"${retained_fee:.2f} was retained as "
                "the platform service fee."
            )

        else:
            cursor.execute(
                """
                UPDATE deal_escrow
                SET
                    status = 'Held',
                    updated_at = CURRENT_TIMESTAMP
                WHERE room_id = %s
                  AND status = 'Disputed'
                """,
                (room_id,),
            )

            if cursor.rowcount != 1:
                raise WalletError(
                    "The disputed escrow could not be "
                    "restored."
                )

            cursor.execute(
                """
                UPDATE room
                SET current_step = 'Delivery'
                WHERE room_id = %s
                """,
                (room_id,),
            )

            dispute_terminal_status = "Rejected"
            user_message = (
                "An administrator rejected the dispute. "
                "The escrow remains protected and the "
                "deal has returned to the delivery stage."
            )

        cursor.execute(
            """
            UPDATE disputes
            SET
                status = %s,
                updated_at = CURRENT_TIMESTAMP,
                closed_at = CURRENT_TIMESTAMP
            WHERE dispute_id = %s
            """,
            (
                dispute_terminal_status,
                dispute_id,
            ),
        )

        cursor.execute(
            """
            INSERT INTO dispute_resolution (
                dispute_id,
                resolved_by,
                decision,
                refund_amount,
                winner_user,
                resolution_note,
                resolved_at,
                seller_release_amount,
                retained_fee
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP,
                %s,
                %s
            )
            RETURNING resolution_id
            """,
            (
                dispute_id,
                admin_id,
                decision,
                refund_amount,
                winner_user,
                resolution_note,
                seller_release_amount,
                retained_fee,
            ),
        )

        resolution_id = cursor.fetchone()[0]

        if fulfillment_proof is not None:
            cursor.execute(
                """
                UPDATE deal_proofs
                SET
                    reviewed = TRUE,
                    admin_note = %s
                WHERE room_id = %s
                  AND proof_type = 'Fulfillment'
                """,
                (
                    resolution_note,
                    room_id,
                ),
            )

        for participant_id in {
            buyer_id,
            seller_id,
        }:
            create_user_notification(
                cursor,
                user_id=participant_id,
                notification_type="DisputeResolved",
                title="Dispute decision issued",
                message=user_message,
                room_id=room_id,
                room_code=room_code,
            )

        conn.commit()

        event_data = {
            "room_id": room_id,
            "room_code": room_code,
            "dispute_id": dispute_id,
            "resolution_id": resolution_id,
            "decision": decision,
            "resource": "dispute",
            "status": dispute_terminal_status,
        }

        socketio.emit(
            "dispute_resolved",
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

        for participant_id in {
            buyer_id,
            seller_id,
        }:
            socketio.emit(
                "wallet_updated",
                {
                    **event_data,
                    "resource": "wallet",
                },
                room=f"user_{participant_id}",
            )

            socketio.emit(
                "user_data_changed",
                event_data,
                room=f"user_{participant_id}",
            )

        emit_notifications_changed({
            buyer_id,
            seller_id,
        })

        socketio.emit(
            "admin_disputes_changed",
            event_data,
            room="admins",
        )

        if decision == "ReleaseToSeller":
            socketio.emit(
                "transaction_completed",
                {
                    **event_data,
                    "transaction_id": transaction_id,
                },
                room="admins",
            )

        return jsonify({
            "success": True,
            "message": user_message,
            "dispute_id": dispute_id,
            "resolution_id": resolution_id,
            "decision": decision,
            "dispute_status": (
                dispute_terminal_status
            ),
            "room_status": (
                "Completed"
                if decision == "ReleaseToSeller"
                else (
                    "Cancelled"
                    if decision == "RefundBuyer"
                    else room_status
                )
            ),
            "current_step": (
                "Completed"
                if decision == "ReleaseToSeller"
                else (
                    "Cancelled"
                    if decision == "RefundBuyer"
                    else "Delivery"
                )
            ),
            "escrow_status": (
                "Released"
                if decision == "ReleaseToSeller"
                else (
                    "Refunded"
                    if decision == "RefundBuyer"
                    else "Held"
                )
            ),
            "refund_amount": float(refund_amount),
            "seller_release_amount": float(
                seller_release_amount
            ),
            "retained_fee": float(retained_fee),
            "transaction_id": transaction_id,
            "requested_resolution": (
                requested_resolution
            ),
            "reused": False,
        }), 200

    except WalletError as error:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(error),
        }), 409

    except Exception:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to resolve this dispute."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()

@admin_bp.route(
    "/disputes/<int:dispute_id>/fulfillment-proof",
    methods=["GET"],
)
@admin_required
def get_admin_dispute_fulfillment_proof(dispute_id):
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT p.file_path
            FROM disputes d
            JOIN deal_proofs p
                ON p.room_id = d.room_id
               AND p.proof_type = 'Fulfillment'
            WHERE d.dispute_id = %s
            """,
            (dispute_id,),
        )

        proof = cursor.fetchone()

        if not proof:
            return jsonify({
                "success": False,
                "message": (
                    "Fulfillment proof was not found."
                ),
            }), 404

        stored_path = proof[0]
        expected_prefix = "deal_proofs/"

        if not stored_path.startswith(expected_prefix):
            return jsonify({
                "success": False,
                "message": (
                    "The stored proof path is invalid."
                ),
            }), 500

        proof_filename = os.path.basename(stored_path)

        if not proof_filename:
            return jsonify({
                "success": False,
                "message": (
                    "The proof filename is invalid."
                ),
            }), 500

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

    except Exception:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load fulfillment proof."
            ),
        }), 500

    finally:
        cursor.close()
        conn.close()