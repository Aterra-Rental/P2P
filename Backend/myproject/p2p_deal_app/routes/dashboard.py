from flask import Blueprint, jsonify
from database import get_db

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard/<int:user_id>", methods=["GET"])
def get_dashboard(user_id):
    conn = get_db()
    cur = conn.cursor()

    # Wallet
    cur.execute("""
        SELECT
            COALESCE(available_balance,0),
            COALESCE(pending_balance,0),
            COALESCE(total_received,0),
            COALESCE(total_withdrawn,0)
        FROM user_wallet
        WHERE user_id=%s
    """, (user_id,))

    wallet = cur.fetchone()

    # Total deals
    cur.execute("""
        SELECT COUNT(*)
        FROM room
        WHERE created_by=%s
           OR partner_user_id=%s
    """, (user_id, user_id))

    total_deals = cur.fetchone()[0]

    # Completed deals
    cur.execute("""
        SELECT COUNT(*)
        FROM room
        WHERE status='Completed'
        AND (created_by=%s OR partner_user_id=%s)
    """, (user_id, user_id))

    completed = cur.fetchone()[0]

    cur.close()
    conn.close()

    return jsonify({
        "wallet": {
            "available": wallet[0] if wallet else 0,
            "pending": wallet[1] if wallet else 0,
            "received": wallet[2] if wallet else 0,
            "withdrawn": wallet[3] if wallet else 0,
        },
        "total_deals": total_deals,
        "completed_deals": completed
    })