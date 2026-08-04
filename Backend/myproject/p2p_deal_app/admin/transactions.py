from flask import jsonify, request

from admin import admin_bp
from database import get_db
from services.admin_required import admin_required


PERIOD_CONFIG = {
    "today": {
        "start": "date_trunc('day', CURRENT_TIMESTAMP)",
        "end": (
            "date_trunc('day', CURRENT_TIMESTAMP) "
            "+ INTERVAL '1 day'"
        ),
        "series_end": (
            "date_trunc('day', CURRENT_TIMESTAMP) "
            "+ INTERVAL '23 hours'"
        ),
        "step": "INTERVAL '1 hour'",
        "bucket_end": "bucket_start + INTERVAL '1 hour'",
        "label": "TO_CHAR(bucket_start, 'HH24:00')",
    },
    "week": {
        "start": "date_trunc('week', CURRENT_TIMESTAMP)",
        "end": (
            "date_trunc('week', CURRENT_TIMESTAMP) "
            "+ INTERVAL '1 week'"
        ),
        "series_end": (
            "date_trunc('week', CURRENT_TIMESTAMP) "
            "+ INTERVAL '6 days'"
        ),
        "step": "INTERVAL '1 day'",
        "bucket_end": "bucket_start + INTERVAL '1 day'",
        "label": "TO_CHAR(bucket_start, 'Dy')",
    },
    "month": {
        "start": "date_trunc('month', CURRENT_TIMESTAMP)",
        "end": (
            "date_trunc('month', CURRENT_TIMESTAMP) "
            "+ INTERVAL '1 month'"
        ),
        "series_end": (
            "date_trunc('month', CURRENT_TIMESTAMP) "
            "+ INTERVAL '1 month' - INTERVAL '1 day'"
        ),
        "step": "INTERVAL '7 days'",
        "bucket_end": (
            "LEAST("
            "bucket_start + INTERVAL '7 days', "
            "date_trunc('month', CURRENT_TIMESTAMP) "
            "+ INTERVAL '1 month'"
            ")"
        ),
        "label": (
            "'Week ' || "
            "ROW_NUMBER() OVER (ORDER BY bucket_start)"
        ),
    },
    "year": {
        "start": "date_trunc('year', CURRENT_TIMESTAMP)",
        "end": (
            "date_trunc('year', CURRENT_TIMESTAMP) "
            "+ INTERVAL '1 year'"
        ),
        "series_end": (
            "date_trunc('year', CURRENT_TIMESTAMP) "
            "+ INTERVAL '11 months'"
        ),
        "step": "INTERVAL '1 month'",
        "bucket_end": "bucket_start + INTERVAL '1 month'",
        "label": "TO_CHAR(bucket_start, 'Mon')",
    },
}


def serialize_transaction(row):
    return {
        "transaction_id": row[0],
        "room_code": row[1],
        "item_name": row[2],
        "buyer": {
            "user_id": row[3],
            "name": row[4],
            "email": row[5],
        },
        "seller": {
            "user_id": row[6],
            "name": row[7],
            "email": row[8],
        },
        "transaction_amount": float(row[9]),
        "fee_amount": float(row[10]),
        "seller_receive": float(row[11]),
        "platform_income": float(row[12]),
        "fee_payer": row[13],
        "payment_provider": row[14],
        "status": row[15],
        "completed_at": (
            row[16].isoformat()
            if row[16]
            else None
        ),
    }


@admin_bp.route(
    "/transactions/report",
    methods=["GET"],
)
@admin_required
def get_transaction_report():
    period = str(
        request.args.get("period", "month")
    ).lower()

    if period not in PERIOD_CONFIG:
        return jsonify({
            "success": False,
            "message": (
                "Period must be today, week, "
                "month, or year."
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

    config = PERIOD_CONFIG[period]
    start_expression = config["start"]
    end_expression = config["end"]
    offset = (page - 1) * per_page

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            f"""
            SELECT
                COUNT(*) AS transaction_count,
                COALESCE(
                    SUM(transaction_amount),
                    0
                ) AS gross_volume,
                COALESCE(
                    SUM(platform_income),
                    0
                ) AS platform_income,
                COALESCE(
                    SUM(seller_receive),
                    0
                ) AS seller_payout
            FROM transactions_history
            WHERE transaction_status = 'Completed'
              AND completed_at >= {start_expression}
              AND completed_at < {end_expression}
            """
        )

        summary_row = cursor.fetchone()

        cursor.execute(
            f"""
            WITH buckets AS (
                SELECT generate_series(
                    {start_expression},
                    {config["series_end"]},
                    {config["step"]}
                ) AS bucket_start
            )
            SELECT
                {config["label"]} AS label,
                COUNT(
                    history.transaction_id
                ) AS transaction_count,
                COALESCE(
                    SUM(history.transaction_amount),
                    0
                ) AS gross_volume,
                COALESCE(
                    SUM(history.platform_income),
                    0
                ) AS platform_income
            FROM buckets
            LEFT JOIN transactions_history history
              ON history.transaction_status = 'Completed'
             AND history.completed_at >= bucket_start
             AND history.completed_at
                 < {config["bucket_end"]}
            GROUP BY bucket_start
            ORDER BY bucket_start
            """
        )

        series = [
            {
                "label": row[0],
                "transaction_count": row[1],
                "gross_volume": float(row[2]),
                "platform_income": float(row[3]),
            }
            for row in cursor.fetchall()
        ]

        cursor.execute(
            f"""
            SELECT
                history.transaction_id,
                history.room_code,
                history.item_name,
                history.buyer_id,
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
                    'User #' || history.buyer_id
                ) AS buyer_name,
                buyer_login.email,
                history.seller_id,
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
                    'User #' || history.seller_id
                ) AS seller_name,
                seller_login.email,
                history.transaction_amount,
                history.fee_amount,
                history.seller_receive,
                history.platform_income,
                history.fee_payer,
                history.payment_provider,
                history.transaction_status,
                history.completed_at
            FROM transactions_history history
            LEFT JOIN user_login buyer_login
              ON buyer_login.user_id = history.buyer_id
            LEFT JOIN user_details buyer_details
              ON buyer_details.user_id = history.buyer_id
            LEFT JOIN user_login seller_login
              ON seller_login.user_id = history.seller_id
            LEFT JOIN user_details seller_details
              ON seller_details.user_id = history.seller_id
            WHERE history.transaction_status = 'Completed'
              AND history.completed_at >= {start_expression}
              AND history.completed_at < {end_expression}
            ORDER BY history.completed_at DESC
            LIMIT %s
            OFFSET %s
            """,
            (
                per_page,
                offset,
            ),
        )

        transactions = [
            serialize_transaction(row)
            for row in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "period": period,
            "summary": {
                "transaction_count": summary_row[0],
                "gross_volume": float(summary_row[1]),
                "platform_income": float(summary_row[2]),
                "seller_payout": float(summary_row[3]),
            },
            "series": series,
            "transactions": transactions,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": summary_row[0],
            },
        }), 200

    except Exception as error:
        conn.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Unable to load the transaction report."
            ),
            "detail": str(error),
        }), 500
    finally:
        cursor.close()
        conn.close()