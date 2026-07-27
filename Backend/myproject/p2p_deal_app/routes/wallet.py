from flask import Blueprint, jsonify
from database import get_db

wallet_bp = Blueprint("wallet", __name__)

@wallet_bp.route("/wallet/<int:user_id>", methods=["GET"])
def get_wallet(user_id):
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                available_balance,
                pending_balance,
                total_received,
                total_withdrawn
            FROM user_wallet
            WHERE user_id = %s
        """, (user_id,))

        wallet = cursor.fetchone()

        if not wallet:
            return jsonify({"message": "Wallet not found"}), 404

        return jsonify({
            "available_balance": float(wallet[0]),
            "pending_balance": float(wallet[1]),
            "total_received": float(wallet[2]),
            "total_withdrawn": float(wallet[3])
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()