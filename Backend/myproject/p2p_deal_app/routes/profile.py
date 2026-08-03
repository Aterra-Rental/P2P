from flask import Blueprint, request, jsonify, g
from database import get_db
from socketio_instance import socketio
from services.auth_required import login_required
from services.validation import (
    validate_phone,
    canonicalize_phone,
    validate_national_id,
    validate_username,
    validate_dob,
)
from services.rate_limiter import is_rate_limited, record_attempt
from psycopg2 import errors as pg_errors
import traceback
import re
import os
from werkzeug.utils import secure_filename
import random

profile_bp = Blueprint("profile", __name__)


NATIONAL_ID_FOLDER = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "uploads",
    "national_ids"
)

PROFILE_PICTURE_FOLDER = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "uploads",
    "profile_pictures"
)

os.makedirs(NATIONAL_ID_FOLDER, exist_ok=True)
os.makedirs(PROFILE_PICTURE_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

PROFILE_SUBMIT_MAX_ATTEMPTS = 8
PROFILE_SUBMIT_WINDOW_SECONDS = 10 * 60  # 10 minutes, per authenticated user


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def _file_too_large(file_storage):
    file_storage.stream.seek(0, os.SEEK_END)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    return size > MAX_FILE_SIZE_BYTES


def _cleanup_files(paths):
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass


def _error(field, code, message, status):
    return jsonify({
        "success": False,
        "field": field,
        "code": code,
        "message": message,
    }), status


USERNAME_REGEX = r"^[a-zA-Z0-9_]{3,30}$"


def generate_username(cursor, firstname="", lastname=""):
    base = (firstname + lastname).lower().replace(" ", "")

    if not base:
        base = "user"

    while True:
        username = f"{base}{random.randint(1000, 9999)}"

        cursor.execute(
            "SELECT 1 FROM user_details WHERE username = %s",
            (username,)
        )

        if cursor.fetchone() is None:
            return username


# ==========================
# Get Profile
# ==========================

@profile_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                ud.username,
                ud.firstname,
                ud.lastname,
                ul.email,
                ud.phonenumber,
                ud.nationalidentity_id,
                ud.dob::text,
                ud.address,
                ud.verify_status,
                ud.bio,
                ud.show_email,
                ud.show_phone,
                ud.joined_at,
                ud.profile_visibility
            FROM user_details ud
            JOIN user_login ul
                ON ud.user_id = ul.user_id
            WHERE ud.user_id = %s
        """, (user_id,))

        row = cursor.fetchone()

        if row is None:
            return jsonify({
                "message": "Profile not found"
            }), 404

        return jsonify({
            "username": row[0],
            "firstname": row[1],
            "lastname": row[2],
            "email": row[3],
            "phonenumber": row[4],
            "nationalidentity_id": row[5],
            "dob": row[6],
            "address": row[7],
            "verify_status": row[8],
            "bio": row[9] or "",
            "show_email": row[10],
            "show_phone": row[11],
            "joined_at": row[12],
            "profile_visibility": row[13]
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ==========================
# Create Profile
# ==========================

@profile_bp.route("/profile", methods=["POST"])
@login_required
def create_profile():

    user_id = g.current_user_id

    limited, retry_after = is_rate_limited(
        f"profile_submit:{user_id}",
        PROFILE_SUBMIT_MAX_ATTEMPTS,
        PROFILE_SUBMIT_WINDOW_SECONDS,
    )

    if limited:
        response, status = _error(
            None, "TOO_MANY_ATTEMPTS",
            "Too many profile submission attempts. Please try again later.", 429,
        )
        response.headers["Retry-After"] = str(retry_after)
        return response, status

    record_attempt(f"profile_submit:{user_id}", PROFILE_SUBMIT_WINDOW_SECONDS)

    firstname = request.form.get("firstname", "").strip()
    lastname = request.form.get("lastname", "").strip()
    phone_local = request.form.get("phonenumber", "").strip()
    nationalidentity_id = request.form.get("nationalidentity_id", "").strip()
    dob = request.form.get("dob")
    address = request.form.get("address", "").strip()
    username = request.form.get("username", "").strip().lower()
    national_id_front = request.files.get("national_id_front")
    national_id_back = request.files.get("national_id_back")

    # --------------------------
    # Validation (same rules as before, now shared + structured errors)
    # --------------------------

    if len(firstname) < 2 or not firstname.replace(" ", "").isalpha():
        return _error("firstname", "FIRSTNAME_INVALID", "First name must contain at least 2 letters.", 400)

    if len(lastname) < 2 or not lastname.replace(" ", "").isalpha():
        return _error("lastname", "LASTNAME_INVALID", "Last name must contain at least 2 letters.", 400)

    phone_valid, phone_error = validate_phone(phone_local)
    if not phone_valid:
        return _error("phonenumber", "PHONE_INVALID", phone_error, 400)

    phonenumber = canonicalize_phone(phone_local)

    id_valid, id_error = validate_national_id(nationalidentity_id)
    if not id_valid:
        return _error("nationalidentity_id", "NATIONAL_ID_INVALID", id_error, 400)

    if len(address) < 5:
        return _error("address", "ADDRESS_INVALID", "Address must be at least 5 characters.", 400)

    dob_valid, dob_error = validate_dob(dob)
    if not dob_valid:
        return _error("dob", "DOB_INVALID", dob_error, 400)

    username_valid, username_error = validate_username(username)
    if not username_valid:
        return _error("username", "USERNAME_INVALID", username_error, 400)

    if national_id_front is None or national_id_front.filename == "":
        return _error("national_id_front", "FILE_REQUIRED", "Front National ID image is required.", 400)

    if national_id_back is None or national_id_back.filename == "":
        return _error("national_id_back", "FILE_REQUIRED", "Back National ID image is required.", 400)

    if not allowed_file(national_id_front.filename):
        return _error("national_id_front", "FILE_TYPE_INVALID", "Front image must be PNG, JPG or JPEG.", 400)

    if not allowed_file(national_id_back.filename):
        return _error("national_id_back", "FILE_TYPE_INVALID", "Back image must be PNG, JPG or JPEG.", 400)

    if _file_too_large(national_id_front):
        return _error("national_id_front", "FILE_TOO_LARGE", "Front image must be smaller than 5 MB.", 400)

    if _file_too_large(national_id_back):
        return _error("national_id_back", "FILE_TOO_LARGE", "Back image must be smaller than 5 MB.", 400)

    conn = get_db()
    cursor = conn.cursor()

    saved_paths = []  # files THIS request writes -- cleaned up if anything fails after

    try:
        # Confirm the authenticated account still exists
        cursor.execute(
            "SELECT user_id FROM user_login WHERE user_id = %s",
            (user_id,)
        )

        if cursor.fetchone() is None:
            return _error(None, "USER_NOT_FOUND", "Authenticated account no longer exists.", 404)

        # --------------------------
        # Username
        # --------------------------

        if username:
            cursor.execute(
                "SELECT user_id FROM user_details WHERE username = %s",
                (username,)
            )

            if cursor.fetchone():
                return _error("username", "USERNAME_TAKEN", "Username already exists.", 409)
        else:
            username = generate_username(cursor, firstname, lastname)

        # --------------------------
        # Existing profile check
        # --------------------------

        cursor.execute("""
            SELECT verify_status
            FROM user_details
            WHERE user_id = %s
        """, (user_id,))

        existing = cursor.fetchone()

        if existing:
            status = (existing[0] or "").lower()

            if status in ("pending", "verified"):
                return _error(None, "PROFILE_EXISTS", "Profile already exists.", 409)

            if status == "rejected":
                return _error(
                    None, "PROFILE_EXISTS",
                    "Profile was rejected. Please edit and resubmit instead.", 409,
                )

        # --------------------------
        # Phone / National ID uniqueness pre-checks
        # (Phone has no DB constraint yet -- this is the only protection
        #  until the Phase 4 migration is approved and applied.)
        # --------------------------

        cursor.execute(
            "SELECT user_id FROM user_details WHERE phonenumber = %s",
            (phonenumber,)
        )

        if cursor.fetchone():
            return _error(
                "phonenumber", "PHONE_TAKEN",
                "This phone number is already connected to another account.", 409,
            )

        cursor.execute(
            "SELECT user_id FROM user_details WHERE nationalidentity_id = %s",
            (nationalidentity_id,)
        )

        if cursor.fetchone():
            return _error(
                "nationalidentity_id", "NATIONAL_ID_TAKEN",
                "This National ID is already connected to another account.", 409,
            )

        # --------------------------
        # Only save files after every check above has passed
        # --------------------------

        front_filename = secure_filename(
            f"user_{user_id}_front_{national_id_front.filename}"
        )
        front_filepath = os.path.join(NATIONAL_ID_FOLDER, front_filename)
        national_id_front.save(front_filepath)
        saved_paths.append(front_filepath)

        back_filename = secure_filename(
            f"user_{user_id}_back_{national_id_back.filename}"
        )
        back_filepath = os.path.join(NATIONAL_ID_FOLDER, back_filename)
        national_id_back.save(back_filepath)
        saved_paths.append(back_filepath)

        front_path = f"uploads/national_ids/{front_filename}"
        back_path = f"uploads/national_ids/{back_filename}"

        # --------------------------
        # Insert profile
        # --------------------------

        cursor.execute("""
            INSERT INTO user_details
            (
                user_id,
                username,
                firstname,
                lastname,
                phonenumber,
                nationalidentity_id,
                dob,
                address,
                national_id_front,
                national_id_back,
                verify_status
            )
            VALUES
            (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            user_id,
            username,
            firstname,
            lastname,
            phonenumber,
            nationalidentity_id,
            dob,
            address,
            front_path,
            back_path,
            "Pending"
        ))

        conn.commit()

        socketio.emit(
            "verification_updated",
            {
                "user_id": user_id,
                "firstname": firstname,
                "lastname": lastname,
                "status": "Pending",
                "message": "A new verification request has been submitted."
            },
            room="admins"
        )

        return jsonify({
            "success": True,
            "message": "Profile created successfully"
        }), 201

    except pg_errors.UniqueViolation as e:
        conn.rollback()
        _cleanup_files(saved_paths)

        constraint = (getattr(e.diag, "constraint_name", "") or "").lower()

        if "nationalidentity_id" in constraint:
            return _error(
                "nationalidentity_id", "NATIONAL_ID_TAKEN",
                "This National ID is already connected to another account.", 409,
            )

        if "username" in constraint:
            return _error("username", "USERNAME_TAKEN", "Username already exists.", 409)

        if "phonenumber" in constraint:
            return _error(
                "phonenumber", "PHONE_TAKEN",
                "This phone number is already connected to another account.", 409,
            )

        return _error(None, "PROFILE_CONFLICT", "This profile conflicts with an existing account.", 409)

    except Exception:
        conn.rollback()
        _cleanup_files(saved_paths)
        traceback.print_exc()

        return _error(None, "SERVER_ERROR", "Something went wrong. Please try again.", 500)

    finally:
        cursor.close()
        conn.close()


# ==========================
# Update Profile
# ==========================

@profile_bp.route("/profile/<int:user_id>", methods=["PUT"])
def update_profile(user_id):

    data = request.get_json()

    username = (data.get("username") or "").strip().lower()
    bio = (data.get("bio") or "").strip()
    address = (data.get("address") or "").strip()

    show_email = bool(data.get("show_email", False))
    show_phone = bool(data.get("show_phone", False))

    profile_visibility = (
        data.get("profile_visibility") or "public"
    ).strip().lower()

    if username and not re.fullmatch(USERNAME_REGEX, username):
        return jsonify({
            "message": "Username must be 3–30 characters and contain only letters, numbers or underscores."
        }), 400

    if len(bio) > 120:
        return jsonify({
            "message": "Bio cannot exceed 120 characters."
        }), 400

    if profile_visibility not in ("public", "private"):
        return jsonify({
            "message": "Invalid profile visibility."
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:

        cursor.execute(
            "SELECT username FROM user_details WHERE user_id = %s",
            (user_id,)
        )

        existing = cursor.fetchone()

        if existing is None:
            return jsonify({
                "message": "Profile not found."
            }), 404

        if not username:
            username = existing[0]

        cursor.execute("""
            SELECT user_id
            FROM user_details
            WHERE username = %s
              AND user_id <> %s
        """, (username, user_id))

        if cursor.fetchone():
            return jsonify({
                "message": "Username already exists."
            }), 409

        cursor.execute("""
            UPDATE user_details
            SET
                username = %s,
                bio = %s,
                address = %s,
                show_email = %s,
                show_phone = %s,
                profile_visibility = %s
            WHERE user_id = %s
        """, (
            username,
            bio if bio else None,
            address,
            show_email,
            show_phone,
            profile_visibility,
            user_id
        ))

        conn.commit()

        return jsonify({
            "message": "Profile updated successfully."
        }), 200

    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cursor.close()
        conn.close()


@profile_bp.route("/profile/<int:user_id>/picture", methods=["PUT"])
def upload_profile_picture(user_id):

    picture = request.files.get("profile_picture")

    if picture is None or picture.filename == "":
        return jsonify({"message": "No image selected"}), 400

    if not allowed_file(picture.filename):
        return jsonify({"message": "Image must be PNG, JPG or JPEG"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT user_id FROM user_details WHERE user_id = %s",
            (user_id,)
        )

        if cursor.fetchone() is None:
            return jsonify({"message": "Profile not found"}), 404

        user_folder = os.path.join(
                PROFILE_PICTURE_FOLDER,
                f"user_{user_id}")

        os.makedirs(user_folder, exist_ok=True)

        extension = picture.filename.rsplit(".", 1)[1].lower()

        filename = f"profile.{extension}"

        filepath = os.path.join(
                    user_folder,
                    filename
                )

        picture.save(filepath)

        image_path = (
                    f"uploads/profile_pictures/user_{user_id}/{filename}"
                    )

        cursor.execute(
            """
            UPDATE user_details
            SET profile_picture = %s
            WHERE user_id = %s
            """,
            (image_path, user_id)
        )

        conn.commit()

        return jsonify({
            "message": "Profile picture updated successfully",
            "profile_picture": image_path
        }), 200

    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()