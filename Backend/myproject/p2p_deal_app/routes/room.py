from flask import Blueprint, request, jsonify
from database import get_db

room_bp = Blueprint("room", __name__)


# ======================================================
# CHECK WHETHER A USER EXISTS
# ======================================================
@room_bp.route("/check-user/<int:user_id>", methods=["GET"])
def check_user(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                user_id,
                firstname,
                lastname,
                verify_status
            FROM user_details
            WHERE user_id = %s
        """, (user_id,))

        user = cur.fetchone()

        if not user:
            return jsonify({
                "exists": False,
                "message": "User ID not found."
            }), 404

        return jsonify({
            "exists": True,
            "user": {
                "user_id": user[0],
                "firstname": user[1],
                "lastname": user[2],
                "verify_status": user[3]
            }
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()