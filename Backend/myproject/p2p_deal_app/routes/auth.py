from flask import Blueprint, request, jsonify
from database import get_db
import bcrypt
from services.auth_token import create_access_token
from socketio_instance import socketio
auth_bp = Blueprint("auth", __name__)
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    conn = get_db()
    print("DSN:", conn.dsn)
    cursor = conn.cursor()

    cursor.execute("SELECT current_database(), current_schema(), version();")
    print(cursor.fetchone())

    try:
        # Check if email already exists
        cursor.execute(
            "SELECT user_id FROM user_login WHERE email = %s",
            (email,)
        )

        if cursor.fetchone():
            return jsonify({"message": "Email already exists"}), 409

        # Hash password
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        # Insert new user
        cursor.execute(
            """
            INSERT INTO user_login (email, passwordhash)
            VALUES (%s, %s)
            RETURNING user_id
            """,
            (email, password_hash)
        )

        new_user_id = cursor.fetchone()[0]

        conn.commit()

        cursor.execute("SELECT COUNT(*) FROM user_login")
        print("Rows:", cursor.fetchone()[0])

        cursor.execute("""
            SELECT user_id, email
            FROM user_login
            ORDER BY user_id DESC
            LIMIT 5
        """)
        print(cursor.fetchall())

        socketio.emit(
            "new_user_registered",
            {
                "user_id": new_user_id,
                "email": email,
            },
            room="admins",
        )

        return jsonify({"message": "Registration successful"}), 201

    except Exception as e:
                conn.rollback()
                return jsonify({"message": str(e)}), 500

    finally:
            cursor.close()
            conn.close()
@auth_bp.route("/login", methods=["POST"])
def login():
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
            SELECT user_id, email, passwordhash
            FROM user_login
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "Invalid email or password"}), 401

        user_id, user_email, password_hash = user

        if not bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        ):
            return jsonify({"message": "Invalid email or password"}), 401

        access_token = create_access_token(
            user_id=user_id,
            email=user_email,
        )

        return jsonify({
            "message": "Login successful",
            "user_id": user_id,
            "email": user_email,
            "token": access_token,
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()