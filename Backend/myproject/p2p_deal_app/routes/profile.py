from flask import Blueprint, request, jsonify
from database import get_db
import traceback
import re
import os
from werkzeug.utils import secure_filename

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


# ==========================
# Create Profile
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

        # Prevent duplicate profile
        cursor.execute(
            "SELECT user_id FROM user_details WHERE user_id = %s",
            (user_id,)
        )

        if cursor.fetchone() is not None:
            return jsonify({"message": "Profile already exists"}), 409

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

        # Insert profile
        cursor.execute(
            """
            INSERT INTO user_details
            (
                user_id,
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
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                user_id,
                firstname,
                lastname,
                phonenumber,
                nationalidentity_id,
                dob,
                address,
                front_path,
                back_path,
                "Pending"
            )
        )

        conn.commit()

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
# Get Profile
# ==========================
@profile_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                firstname,
                lastname,
                phonenumber,
                nationalidentity_id,
                dob::text,
                address,
                national_id_front,
                national_id_back,
                profile_picture,
                verify_status
            FROM user_details
            WHERE user_id = %s
            """,
            (user_id,)
        )

        profile = cursor.fetchone()

        if profile is None:
            return jsonify({
                "message": "Profile not found"
            }), 404

        return jsonify({
            "firstname": profile[0],
            "lastname": profile[1],
            "phonenumber": profile[2],
            "nationalidentity_id": profile[3],
            "dob": profile[4],
            "address": profile[5],
            "national_id_front": profile[6],
            "national_id_back": profile[7],
            "profile_picture": profile[8],
            "verify_status": profile[9]
        }), 200

    except Exception as e:
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