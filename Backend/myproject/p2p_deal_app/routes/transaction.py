from flask import Blueprint, jsonify
from database import get_db

transaction_bp = Blueprint("transaction", __name__)
@transaction_bp.route("/transactions", methods=["GET"])
def get_all_transactions():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            th.transaction_id,
            th.room_id,

            r.item_name,

            b.firstname,
            b.lastname,

            s.firstname,
            s.lastname,

            th.transaction_amount,
            th.transaction_status,
            th.completed_at

        FROM transactions_history th

        JOIN room r
            ON th.room_id = r.room_id

        JOIN user_details b
            ON th.buyer_id = b.user_id

        JOIN user_details s
            ON th.seller_id = s.user_id

        ORDER BY th.transaction_id DESC
    """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    transactions = []

    for row in rows:
        transactions.append({
            "transactionId": row[0],
            "roomId": row[1],
            "item": row[2],

            # Temporary: assume the logged-in user is the buyer.
            "partner": f"{row[5]} {row[6]}",

            "amount": float(row[7]),
            "status": row[8],
            "completedAt": row[9]
        })

    return jsonify(transactions)
@transaction_bp.route("/transactions/<int:transaction_id>", methods=["GET"])
def get_transaction(transaction_id):

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    SELECT
        th.transaction_id,
        th.room_id,

        r.item_name,
        r.item_description,
        r.agreed_price,

        b.user_id AS buyer_id,
        b.firstname AS buyer_first_name,
        b.lastname AS buyer_last_name,

        s.user_id AS seller_id,
        s.firstname AS seller_first_name,
        s.lastname AS seller_last_name,

        th.transaction_amount,
        th.fee_amount,
        th.seller_receive,
        th.platform_income,
        th.transaction_status,
        th.created_at,
        th.completed_at

    FROM transactions_history th

    JOIN room r
        ON th.room_id = r.room_id

    JOIN user_details b
        ON th.buyer_id = b.user_id

    JOIN user_details s
        ON th.seller_id = s.user_id

    WHERE th.transaction_id = %s
    """, (transaction_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()

    if not row:
        return jsonify({"message": "Transaction not found"}), 404

    return jsonify({
    "transactionId": row[0],
    "roomId": row[1],

    "item": row[2],
    "description": row[3],
    "agreedPrice": float(row[4]) if row[4] else None,

    "buyer": {
        "id": row[5],
        "firstName": row[6],
        "lastName": row[7]
    },

    "seller": {
        "id": row[8],
        "firstName": row[9],
        "lastName": row[10]
    },

    "amount": float(row[11]),
    "fee": float(row[12]),
    "sellerReceive": float(row[13]),
    "platformIncome": float(row[14]),

    "status": row[15],
    "createdAt": row[16],
    "completedAt": row[17]
})