"""
Shared validation helpers for account/profile input.
"""

import re
from datetime import date

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 64
PASSWORD_MAX_BYTES = 72  # bcrypt's hard limit on UTF-8 encoded input

PASSWORD_REQUIREMENTS = (
    (re.compile(r"[a-z]"), "lowercase letter"),
    (re.compile(r"[A-Z]"), "uppercase letter"),
    (re.compile(r"[0-9]"), "number"),
    (re.compile(r"[^A-Za-z0-9\s]"), "special character"),
)

PHONE_LOCAL_REGEX = re.compile(r"^\d{8,9}$")
NATIONAL_ID_REGEX = re.compile(r"^\d{9}$")
USERNAME_REGEX = re.compile(r"^[a-z0-9_]{3,30}$")


def normalize_email(raw_email):
    """Trim whitespace and lowercase an email for lookup/storage."""
    if not raw_email:
        return ""
    return raw_email.strip().lower()


def validate_email(email):
    """Returns (is_valid, error_message). Uniqueness stays a DB-backed check."""
    if not email:
        return False, "Email is required."

    if len(email) > 255:
        return False, "Email must be 255 characters or fewer."

    if not EMAIL_REGEX.match(email):
        return False, "Enter a valid email address."

    return True, None


def validate_password(password):
    """
    Registration/password-creation policy ONLY.
    Do not call this from the login route.
    """
    if not password:
        return False, "Password is required."

    if any(ch.isspace() for ch in password):
        return False, "Password must not contain spaces."

    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters."

    if len(password) > PASSWORD_MAX_LENGTH:
        return False, f"Password must be {PASSWORD_MAX_LENGTH} characters or fewer."

    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        return False, "Password is too long to hash safely."

    missing = [
        description
        for pattern, description in PASSWORD_REQUIREMENTS
        if not pattern.search(password)
    ]

    if missing:
        return False, (
            "Password must be 8-64 characters and include an uppercase "
            "letter, lowercase letter, number, and special character."
        )

    return True, None


def validate_phone(local_digits):
    """
    Validates the LOCAL part only (no +855 prefix) -- matches the
    existing 8-or-9-digit Cambodian phone rule. Returns (is_valid, error).
    """
    if not local_digits or not PHONE_LOCAL_REGEX.match(local_digits):
        return False, "Phone number must contain 8 or 9 digits."

    return True, None


def canonicalize_phone(local_digits):
    """Store one canonical format: +855 followed by the validated digits."""
    return "+855" + local_digits


def validate_national_id(national_id):
    if not national_id or not NATIONAL_ID_REGEX.match(national_id):
        return False, "National Identity ID must contain exactly 9 digits."

    return True, None


def validate_username(username):
    """Username is optional -- empty is valid (auto-generated instead)."""
    if not username:
        return True, None

    if not USERNAME_REGEX.match(username):
        return False, (
            "Username must be 3-30 characters and contain only "
            "letters, numbers or underscores."
        )

    return True, None


def validate_dob(dob_str):
    """Returns (is_valid, error_message). Expects YYYY-MM-DD (HTML date input format)."""
    if not dob_str:
        return False, "Date of birth is required."

    try:
        dob = date.fromisoformat(dob_str)
    except (ValueError, TypeError):
        return False, "Enter a valid date of birth."

    if dob > date.today():
        return False, "Date of birth cannot be in the future."

    return True, None