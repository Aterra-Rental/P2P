from flask import Blueprint, request, jsonify
from database import get_db
import traceback
import re
import os
from werkzeug.utils import secure_filename
import random
import string

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


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )



USERNAME_REGEX = r"^[a-zA-Z0-9_]{3,30}$"


def generate_username(cursor, firstname="", lastname=""):
    base = (firstname + lastname).lower().replace(" ", "")

    if not base:
        base = "user"

    while True:
        username = f"{base}{random.randint(1000,9999)}"

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
# ==========================

@profile_bp.route("/profile", methods=["POST"])
def create_profile():

    user_id = request.form.get("user_id")
    firstname = request.form.get("firstname", "").strip()
    lastname = request.form.get("lastname", "").strip()
    phonenumber = request.form.get("phonenumber", "").strip()
    nationalidentity_id = request.form.get("nationalidentity_id", "").strip()
    dob = request.form.get("dob")
    address = request.form.get("address", "").strip()
    username = request.form.get("username", "").strip().lower()
    national_id_front = request.files.get("national_id_front")
    national_id_back = request.files.get("national_id_back")

    # --------------------------
    # Validation
    # --------------------------

    if not user_id:
        return jsonify({"message": "User ID is required"}), 400

    if len(firstname) < 2 or not firstname.replace(" ", "").isalpha():
        return jsonify({"message": "First name must contain at least 2 letters."}), 400

    if len(lastname) < 2 or not lastname.replace(" ", "").isalpha():
        return jsonify({"message": "Last name must contain at least 2 letters."}), 400

    if not re.fullmatch(r"\d{8,9}", phonenumber):
        return jsonify({"message": "Phone number must contain 8 or 9 digits."}), 400

    phonenumber = "+855" + phonenumber

    if not re.fullmatch(r"\d{9}", nationalidentity_id):
        return jsonify({"message": "National Identity ID must contain exactly 9 digits."}), 400

    if len(address) < 5:
        return jsonify({"message": "Address must be at least 5 characters."}), 400
    if username and not re.fullmatch(USERNAME_REGEX, username):
        return jsonify({
        "message": "Username must be 3–30 characters and contain only letters, numbers or underscores."
        }), 400
    if national_id_front is None or national_id_front.filename == "":
        return jsonify({"message": "Front National ID image is required."}), 400

    if national_id_back is None or national_id_back.filename == "":
        return jsonify({"message": "Back National ID image is required."}), 400

    if not allowed_file(national_id_front.filename):
        return jsonify({"message": "Front image must be PNG, JPG or JPEG."}), 400

    if not allowed_file(national_id_back.filename):
        return jsonify({"message": "Back image must be PNG, JPG or JPEG."}), 400
    
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Check user exists
        cursor.execute(
            "SELECT user_id FROM user_login WHERE user_id = %s",
            (user_id,)
        )

        if cursor.fetchone() is None:
            return jsonify({"message": "User not found"}), 404
                # --------------------------
        # Username validation
        # --------------------------

        if username:
            cursor.execute(
                "SELECT user_id FROM user_details WHERE username = %s",
                (username,)
            )

            if cursor.fetchone():
                return jsonify({
                    "message": "Username already exists."
                }), 409
        else:
            username = generate_username(
                cursor,
                firstname,
                lastname
            )

        # --------------------------
        # Check existing profile
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
                return jsonify({
                    "message": "Profile already exists."
                }), 409

            # Rejected profile cannot create another one.
            # The user should edit/resubmit instead.
            if status == "rejected":
                return jsonify({
                    "message": "Profile was rejected. Please edit and resubmit instead."
                }), 409

        # Save front image
        front_filename = secure_filename(
            f"user_{user_id}_front_{national_id_front.filename}"
        )

        front_filepath = os.path.join(NATIONAL_ID_FOLDER, front_filename)
        national_id_front.save(front_filepath)

        # Save back image
        back_filename = secure_filename(
            f"user_{user_id}_back_{national_id_back.filename}"
        )

        back_filepath = os.path.join(NATIONAL_ID_FOLDER, back_filename)
        national_id_back.save(back_filepath)

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

        return jsonify({
            "message": "Profile created successfully"
        }), 201

        return jsonify({
            "message": "Profile created successfully"
        }), 201

    except Exception as e:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "message": str(e)
        }), 500

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

        # Check current profile
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

        # Username already used?
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

        # Create user folder
        user_folder = os.path.join(
                PROFILE_PICTURE_FOLDER,
                f"user_{user_id}")

        os.makedirs(user_folder, exist_ok=True)

                # Keep original extension
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
