from flask import Blueprint, request, jsonify
from psycopg2 import errors as pg_errors
import bcrypt

from database import get_db
from services.auth_token import create_access_token
from services.validation import normalize_email, validate_email, validate_password
from services.rate_limiter import is_rate_limited, record_attempt, reset
from socketio_instance import socketio

auth_bp = Blueprint("auth", __name__)

# --- Rate limit settings (tune these to taste) ---
REGISTER_MAX_ATTEMPTS = 10
REGISTER_WINDOW_SECONDS = 60 * 60  # 1 hour, per IP

LOGIN_IP_MAX_ATTEMPTS = 20
LOGIN_IP_WINDOW_SECONDS = 15 * 60  # 15 minutes, per IP

LOGIN_ACCOUNT_MAX_ATTEMPTS = 5
LOGIN_ACCOUNT_WINDOW_SECONDS = 15 * 60  # 15 minutes, per email


def _client_ip():
    # Single-process dev deployment, no reverse proxy in front today.
    # If one is added later, prefer X-Forwarded-For here instead.
    return request.remote_addr or "unknown"


def _error(field, code, message, status):
    response = jsonify({
        "success": False,
        "field": field,
        "code": code,
        "message": message,
    })
    return response, status


@auth_bp.route("/register", methods=["POST"])
def register():
    ip = _client_ip()

    limited, retry_after = is_rate_limited(
        f"register:{ip}", REGISTER_MAX_ATTEMPTS, REGISTER_WINDOW_SECONDS
    )

    if limited:
        response, status = _error(
            None, "TOO_MANY_ATTEMPTS",
            "Too many registration attempts. Please try again later.", 429,
        )
        response.headers["Retry-After"] = str(retry_after)
        return response, status

    record_attempt(f"register:{ip}", REGISTER_WINDOW_SECONDS)

    data = request.get_json(silent=True)

    if not data:
        return _error(None, "INVALID_JSON", "Request body must be valid JSON.", 400)

    email = normalize_email(data.get("email"))
    password = data.get("password")

    email_valid, email_error = validate_email(email)
    if not email_valid:
        return _error("email", "EMAIL_INVALID", email_error, 400)

    password_valid, password_error = validate_password(password)
    if not password_valid:
        return _error("password", "PASSWORD_WEAK", password_error, 400)

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT user_id FROM user_login WHERE email = %s",
            (email,),
        )

        if cursor.fetchone():
            return _error(
                "email", "EMAIL_TAKEN",
                "An account with this email already exists.", 409,
            )

        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute(
            """
            INSERT INTO user_login (email, passwordhash)
            VALUES (%s, %s)
            RETURNING user_id
            """,
            (email, password_hash),
        )

        new_user_id = cursor.fetchone()[0]
        conn.commit()

        socketio.emit(
            "new_user_registered",
            {"user_id": new_user_id, "email": email},
            room="admins",
        )

        return jsonify({
            "success": True,
            "message": "Registration successful",
        }), 201

    except pg_errors.UniqueViolation:
        conn.rollback()
        return _error(
            "email", "EMAIL_TAKEN",
            "An account with this email already exists.", 409,
        )

    except Exception:
        conn.rollback()
        return _error(
            None, "SERVER_ERROR",
            "Something went wrong. Please try again.", 500,
        )

    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    ip = _client_ip()

    data = request.get_json(silent=True)

    if not data:
        return _error(None, "INVALID_JSON", "Request body must be valid JSON.", 400)

    email = normalize_email(data.get("email"))
    password = data.get("password")

    if not email or not password:
        return _error(None, "MISSING_FIELDS", "Email and password are required.", 400)

    ip_limited, ip_retry_after = is_rate_limited(
        f"login_ip:{ip}", LOGIN_IP_MAX_ATTEMPTS, LOGIN_IP_WINDOW_SECONDS
    )
    account_limited, account_retry_after = is_rate_limited(
        f"login_acct:{email}", LOGIN_ACCOUNT_MAX_ATTEMPTS, LOGIN_ACCOUNT_WINDOW_SECONDS
    )

    if ip_limited or account_limited:
        retry_after = max(ip_retry_after, account_retry_after)
        response, status = _error(
            None, "TOO_MANY_ATTEMPTS",
            "Too many login attempts. Please try again later.", 429,
        )
        response.headers["Retry-After"] = str(retry_after)
        return response, status

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT user_id, email, passwordhash
            FROM user_login
            WHERE email = %s
            """,
            (email,),
        )

        user = cursor.fetchone()

        if not user:
            record_attempt(f"login_ip:{ip}", LOGIN_IP_WINDOW_SECONDS)
            record_attempt(f"login_acct:{email}", LOGIN_ACCOUNT_WINDOW_SECONDS)
            return _error(None, "INVALID_CREDENTIALS", "Invalid email or password.", 401)

        user_id, user_email, password_hash = user

        if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
            record_attempt(f"login_ip:{ip}", LOGIN_IP_WINDOW_SECONDS)
            record_attempt(f"login_acct:{email}", LOGIN_ACCOUNT_WINDOW_SECONDS)
            return _error(None, "INVALID_CREDENTIALS", "Invalid email or password.", 401)

        # Successful login: clear this account's failed-attempt history.
        reset(f"login_acct:{email}")

        access_token = create_access_token(user_id=user_id, email=user_email)

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user_id": user_id,
            "email": user_email,
            "token": access_token,
        }), 200

    except Exception:
        return _error(None, "SERVER_ERROR", "Something went wrong. Please try again.", 500)

    finally:
        cursor.close()
        conn.close()