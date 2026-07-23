from flask import Blueprint, request, jsonify
from database import get_db

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/profile", methods=["POST"])
def create_profile():
    data = request.get_json()

    user_id = data.get("user_id")
    firstname = data.get("firstname")
    lastname = data.get("lastname")
    phonenumber = data.get("phonenumber")
    nationalidentity_id = data.get("nationalidentity_id")
    dob = data.get("dob")
    address = data.get("address")

    if not user_id:
        return jsonify({"message": "User ID is required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:

        # Verify user exists
        cursor.execute(
            "SELECT user_id FROM user_login WHERE user_id = %s",
            (user_id,)
        )

        if not cursor.fetchone():
            return jsonify({"message": "User not found"}), 404

        # Prevent duplicate profile
        cursor.execute(
            "SELECT user_id FROM user_details WHERE user_id = %s",
            (user_id,)
        )

        if cursor.fetchone():
            return jsonify({"message": "Profile already exists"}), 409

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
            VALUES
            (%s,%s,%s,%s,%s,%s,%s,%s)
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

        return jsonify({
            "message": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()
@profile_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                firstname,
                lastname,
                phonenumber,
                nationalidentity_id,
                dob,
                address,
                verify_status
            FROM user_details
            WHERE user_id = %s
        """, (user_id,))

        profile = cursor.fetchone()

        if not profile:
            return jsonify({
                "message": "Profile not found"
            }), 404

        return jsonify({
            "firstname": profile[0],
            "lastname": profile[1],
            "phonenumber": profile[2],
            "nationalidentity_id": profile[3],
            "dob": str(profile[4]),
            "address": profile[5],
            "verify_status": profile[6]
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()