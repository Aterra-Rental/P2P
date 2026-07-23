from flask import Blueprint, request, jsonify
from database import get_db
import traceback
import re

profile_bp = Blueprint("profile", __name__)


# ==========================
# Create Profile
# ==========================
@profile_bp.route("/profile", methods=["POST"])
def create_profile():
    data = request.get_json()

    user_id = data.get("user_id")
    firstname = data.get("firstname", "").strip()
    lastname = data.get("lastname", "").strip()
    phonenumber = data.get("phonenumber", "").strip()
    nationalidentity_id = data.get("nationalidentity_id", "").strip()
    dob = data.get("dob")
    address = data.get("address", "").strip()

    # --------------------------
    # Validation
    # --------------------------

    if not user_id:
        return jsonify({"message": "User ID is required"}), 400

    # First Name
    if len(firstname) < 2 or not firstname.replace(" ", "").isalpha():
        return jsonify({
            "message": "First name must contain at least 2 letters."
        }), 400

    # Last Name
    if len(lastname) < 2 or not lastname.replace(" ", "").isalpha():
        return jsonify({
            "message": "Last name must contain at least 2 letters."
        }), 400

    # Phone Number (8-9 digits after +855)
    if not re.fullmatch(r"\d{8,9}", phonenumber):
        return jsonify({
            "message": "Phone number must contain 8 or 9 digits."
        }), 400

    # Save with +855
    phonenumber = "+855" + phonenumber

    # National Identity ID (exactly 9 digits)
    if not re.fullmatch(r"\d{9}", nationalidentity_id):
        return jsonify({
            "message": "National Identity ID must contain exactly 9 digits."
        }), 400

    # Address
    if len(address) < 5:
        return jsonify({
            "message": "Address must be at least 5 characters."
        }), 400

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
                verify_status
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                user_id,
                firstname,
                lastname,
                phonenumber,
                nationalidentity_id,
                dob,
                address,
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
            "verify_status": profile[6]
        }), 200

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cursor.close()
        conn.close()