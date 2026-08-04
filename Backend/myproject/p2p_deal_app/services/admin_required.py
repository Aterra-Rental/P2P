from functools import wraps

from flask import g, jsonify, request

from services.admin_auth_token import (
    AdminAuthenticationError,
    decode_admin_access_token,
)


def admin_required(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        authorization = request.headers.get(
            "Authorization",
            "",
        )

        scheme, _, token = authorization.partition(" ")

        if (
            scheme.lower() != "bearer"
            or not token.strip()
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Admin Authorization Bearer token "
                    "is required."
                ),
            }), 401

        try:
            admin = decode_admin_access_token(
                token.strip()
            )
        except AdminAuthenticationError as error:
            return jsonify({
                "success": False,
                "message": str(error),
            }), 401

        g.current_admin_id = admin["admin_id"]
        g.current_admin_email = admin.get("email")

        return view_function(*args, **kwargs)

    return wrapped_view