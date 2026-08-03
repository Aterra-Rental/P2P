import bcrypt
from flask import jsonify, request

from database import get_db
from services.admin_auth_token import (
    create_admin_access_token,
)

from . import admin_bp


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body must be valid JSON.",
        }), 400

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required.",
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT admin_id, email, passwordhash
            FROM admin_login
            WHERE LOWER(email) = %s
            """,
            (email,),
        )

        admin = cursor.fetchone()

        if not admin:
            return jsonify({
                "success": False,
                "message": "Invalid email or password.",
            }), 401

        admin_id, admin_email, password_hash = admin

        if isinstance(password_hash, str):
            password_hash = password_hash.encode("utf-8")

        password_matches = bcrypt.checkpw(
            str(password).encode("utf-8"),
            password_hash,
        )

        if not password_matches:
            return jsonify({
                "success": False,
                "message": "Invalid email or password.",
            }), 401

        admin_token = create_admin_access_token(
            admin_id=admin_id,
            email=admin_email,
        )

        return jsonify({
            "success": True,
            "message": "Admin login successful.",
            "admin_id": admin_id,
            "email": admin_email,
            "token": admin_token,
        }), 200

    except Exception:
        return jsonify({
            "success": False,
            "message": "Unable to complete admin login.",
        }), 500

    finally:
        cursor.close()
        conn.close()