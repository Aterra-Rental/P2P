from functools import wraps

from flask import g, jsonify, request

from services.auth_token import (
    AuthenticationError,
    decode_access_token,
)


def login_required(view_function):
    @wraps(view_function)
    def protected_view(*args, **kwargs):
        authorization = request.headers.get(
            "Authorization",
            "",
        )

        scheme, separator, token = authorization.partition(
            " "
        )

        if (
            not separator
            or scheme.lower() != "bearer"
            or not token.strip()
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Authorization Bearer token is required."
                ),
            }), 401

        try:
            authenticated_user = decode_access_token(
                token.strip()
            )
        except AuthenticationError as error:
            return jsonify({
                "success": False,
                "message": str(error),
            }), 401

        g.current_user_id = authenticated_user["user_id"]
        g.current_user_email = authenticated_user.get("email")

        return view_function(*args, **kwargs)

    return protected_view