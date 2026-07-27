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
# Get Profile
# ==========================

@profile_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT firstname, lastname, phonenumber, nationalidentity_id,
                   dob::text, address, verify_status
            FROM user_details
            WHERE user_id = %s
            """,
            (user_id,)
        )
        row = cursor.fetchone()

        if row is None:
            # No profile submitted yet - this is NOT an error state,
            # the frontend should treat 404 here as "show Complete Profile screen"
            return jsonify({"message": "Profile not found"}), 404

        return jsonify({
            "firstname": row[0],
            "lastname": row[1],
            "phonenumber": row[2],
            "nationalidentity_id": row[3],
            "dob": row[4],
            "address": row[5],
            "verify_status": row[6],
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

        # --- FIX: check the EXISTING profile's verify_status instead of
        # blindly blocking whenever any row exists. Only Pending/Verified
        # profiles should block a new submission - a Rejected profile
        # should be allowed to resubmit (we UPDATE it instead of INSERT).
        cursor.execute(
            "SELECT verify_status FROM user_details WHERE user_id = %s",
            (user_id,)
        )
        existing = cursor.fetchone()
        is_resubmission = existing is not None

        if is_resubmission:
            current_status = existing[0]
            if current_status in ("Pending", "Verified"):
                return jsonify({"message": "Profile already exists"}), 409
            # else: current_status == 'Rejected' -> fall through and allow resubmission

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

        if is_resubmission:
            # Update the existing (previously rejected) row with the new
            # submission and reset it back to Pending for re-review.
            cursor.execute(
                """
                UPDATE user_details
                SET
                    firstname = %s,
                    lastname = %s,
                    phonenumber = %s,
                    nationalidentity_id = %s,
                    dob = %s,
                    address = %s,
                    national_id_front = %s,
                    national_id_back = %s,
                    verify_status = %s
                WHERE user_id = %s
                """,
                (
                    firstname,
                    lastname,
                    phonenumber,
                    nationalidentity_id,
                    dob,
                    address,
                    front_path,
                    back_path,
                    "Pending",
                    user_id
                )
            )
        else:
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
            "message": "Profile completed successfully" if not is_resubmission
                        else "Profile resubmitted successfully"
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
