from flask import current_app
from itsdangerous import (
    BadSignature,
    SignatureExpired,
    URLSafeTimedSerializer,
)


TOKEN_SALT = "p2p-access-token"
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24


class AuthenticationError(Exception):
    """Raised when an access token cannot authenticate a user."""

    pass


def _get_serializer():
    secret_key = current_app.config.get("SECRET_KEY")

    if not secret_key:
        raise RuntimeError(
            "SECRET_KEY must be configured."
        )

    return URLSafeTimedSerializer(
        secret_key=secret_key,
        salt=TOKEN_SALT,
    )


def create_access_token(user_id, email):
    serializer = _get_serializer()

    return serializer.dumps({
        "user_id": int(user_id),
        "email": str(email),
    })


def decode_access_token(token):
    if not token:
        raise AuthenticationError(
            "Authentication token is required."
        )

    serializer = _get_serializer()

    try:
        payload = serializer.loads(
            token,
            max_age=TOKEN_MAX_AGE_SECONDS,
        )
    except SignatureExpired as error:
        raise AuthenticationError(
            "Authentication token has expired."
        ) from error
    except BadSignature as error:
        raise AuthenticationError(
            "Authentication token is invalid."
        ) from error

    user_id = payload.get("user_id")

    if not user_id:
        raise AuthenticationError(
            "Authentication token has no user ID."
        )

    return {
        "user_id": int(user_id),
        "email": payload.get("email"),
    }