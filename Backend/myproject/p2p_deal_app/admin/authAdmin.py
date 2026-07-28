from flask import request, jsonify
from . import admin_bp
from database import get_db
import bcrypt


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT admin_id, email, passwordhash
            FROM admin_login
            WHERE email = %s
            """,
            (email,)
        )

        admin = cursor.fetchone()

        if not admin:
            return jsonify({"message": "Invalid email or password"}), 401

        # admin_id, admin_email, password_hash = admin

        # if not bcrypt.checkpw(
        #     password.encode("utf-8"),
        #     password_hash.encode("utf-8")
        # ):
        #     return jsonify({"message": "Invalid email or password"}), 401
        admin_id, admin_email, password_hash = admin

        print("========== ADMIN LOGIN ==========")
        # print("Input Email:", email)
        print("DB Email:", admin_email)
        # print("Input Password:", password)
        # print("DB Hash:", password_hash)

        result = bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )

        print("Password Match:", result)
        print("=================================")

        if not result:
            return jsonify({"message": "Invalid email or password"}), 401

        return jsonify({
            "message": "Admin login successful",
            "admin_id": admin_id,
            "email": admin_email
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()