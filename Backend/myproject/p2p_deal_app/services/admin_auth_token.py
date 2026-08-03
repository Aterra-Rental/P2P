from flask import current_app
from itsdangerous import (
    BadSignature,
    SignatureExpired,
    URLSafeTimedSerializer,
)


ADMIN_TOKEN_SALT = "p2p-admin-access-token"
ADMIN_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 8


class AdminAuthenticationError(Exception):
    """Raised when an access token cannot authenticate an admin."""

    pass


def _get_serializer():
    secret_key = current_app.config.get("SECRET_KEY")

    if not secret_key:
        raise RuntimeError(
            "SECRET_KEY must be configured."
        )

    return URLSafeTimedSerializer(
        secret_key=secret_key,
        salt=ADMIN_TOKEN_SALT,
    )


def create_admin_access_token(admin_id, email):
    serializer = _get_serializer()

    return serializer.dumps({
        "token_type": "admin",
        "admin_id": int(admin_id),
        "email": str(email),
    })


def decode_admin_access_token(token):
    if not token:
        raise AdminAuthenticationError(
            "Admin authentication token is required."
        )

    serializer = _get_serializer()

    try:
        payload = serializer.loads(
            token,
            max_age=ADMIN_TOKEN_MAX_AGE_SECONDS,
        )
    except SignatureExpired as error:
        raise AdminAuthenticationError(
            "Admin authentication token has expired."
        ) from error
    except BadSignature as error:
        raise AdminAuthenticationError(
            "Admin authentication token is invalid."
        ) from error

    if payload.get("token_type") != "admin":
        raise AdminAuthenticationError(
            "Authentication token is not an admin token."
        )

    admin_id = payload.get("admin_id")

    if not admin_id:
        raise AdminAuthenticationError(
            "Admin authentication token has no admin ID."
        )

    return {
        "admin_id": int(admin_id),
        "email": payload.get("email"),
    }