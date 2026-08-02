from flask import jsonify
from . import admin_bp
from database import get_db

@admin_bp.route("/dashboard", methods=["GET"])
def dashboard():
    return jsonify({
        "message": "Admin Dashboard API is working!"
    })

@admin_bp.route('/dashboard/signups-by-month', methods=['GET'])
def signups_by_month():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT TO_CHAR(months.month, 'Mon') AS month,
                   COALESCE(COUNT(user_login.user_id), 0) AS count
            FROM generate_series(
                date_trunc('year', CURRENT_DATE),
                date_trunc('year', CURRENT_DATE) + INTERVAL '11 months',
                INTERVAL '1 month'
            ) AS months(month)
            LEFT JOIN user_login
                ON date_trunc('month', user_login.created_at) = months.month
            GROUP BY months.month
            ORDER BY months.month;
        """)
        rows = cur.fetchall()
        cur.close()
        result = [{"month": r[0], "count": r[1]} for r in rows]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        conn.close()