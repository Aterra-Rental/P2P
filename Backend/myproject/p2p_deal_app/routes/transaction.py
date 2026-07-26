from flask import Blueprint, jsonify
from database import get_db

transaction_bp = Blueprint("transaction", __name__)
@transaction_bp.route("/transactions/<int:transaction_id>", methods=["GET"])
def get_transaction(transaction_id):

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            transaction_id,
            room_id,
            buyer_id,
            seller_id,
            transaction_amount,
            fee_amount,
            seller_receive,
            platform_income,
            transaction_status,
            created_at,
            completed_at
        FROM transactions_history
        WHERE transaction_id = %s
    """, (transaction_id,))

    row = cur.fetchone()

    cur.close()
    conn.close()

    if not row:
        return jsonify({"message": "Transaction not found"}), 404

    return jsonify({
        "transactionId": row[0],
        "roomId": row[1],
        "buyerId": row[2],
        "sellerId": row[3],
        "amount": float(row[4]),
        "fee": float(row[5]),
        "sellerReceive": float(row[6]),
        "platformIncome": float(row[7]),
        "status": row[8],
        "createdAt": row[9],
        "completedAt": row[10]
    })