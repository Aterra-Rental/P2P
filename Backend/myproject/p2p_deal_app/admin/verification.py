from flask import Blueprint, jsonify
from database import get_db
from socketio_instance import socketio
verification_bp = Blueprint("admin_verification", __name__)


@verification_bp.route("/verifications", methods=["GET"])
def get_pending_verifications():

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("""
            SELECT
                ud.user_id,
                CONCAT(ud.firstname, ' ', ud.lastname) AS fullname,
                ul.email,
                ud.phonenumber,
                ud.verify_status
            FROM user_details ud
            JOIN user_login ul
                ON ud.user_id = ul.user_id
            WHERE ud.verify_status = 'Pending'
            ORDER BY ud.user_id DESC;
        """)

        rows = cur.fetchall()

        users = []

        for row in rows:
            users.append({
                "user_id": row[0],
                "fullname": row[1],
                "email": row[2],
                "phone": row[3],
                "verify_status": row[4]
            })

        return jsonify(users), 200

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


@verification_bp.route("/verifications/<int:user_id>", methods=["GET"])
def get_verification_details(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("""
            SELECT
                ud.user_id,
                ud.firstname,
                ud.lastname,
                ul.email,
                ud.phonenumber,
                ud.address,
                ud.nationalidentity_id,
                ud.national_id_front,
                ud.national_id_back,
                ud.verify_status
            FROM user_details ud
            JOIN user_login ul
                ON ud.user_id = ul.user_id
            WHERE ud.user_id = %s;
        """, (user_id,))

        row = cur.fetchone()

        if row is None:
            return jsonify({
                "message": "User not found"
            }), 404

        return jsonify({
            "user_id": row[0],
            "firstname": row[1],
            "lastname": row[2],
            "email": row[3],
            "phonenumber": row[4],
            "address": row[5],
            "nationalidentity_id": row[6],
            "national_id_front": row[7],
            "national_id_back": row[8],
            "verify_status": row[9]
        }), 200

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()
@verification_bp.route("/verifications/<int:user_id>/approve", methods=["PUT"])
def approve_verification(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE user_details
            SET verify_status = 'Verified'
            WHERE user_id = %s
        """, (user_id,))

        if cur.rowcount == 0:
            return jsonify({
                "message": "User not found"
            }), 404

        conn.commit()

        # Notify the user
        socketio.emit(
            "verification_updated",
            {
                "user_id": user_id,
                "status": "Verified"
            },
            room=f"user_{user_id}"
        )

        # Notify all admin dashboards
        socketio.emit(
            "verification_updated",
            {
                "user_id": user_id,
                "status": "Verified",
                "message": "A user was approved."
            },
            room="admins"
        )

        return jsonify({
            "message": "User approved successfully"
        }), 200

    except Exception as e:
        conn.rollback()

        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()
@verification_bp.route("/verifications/<int:user_id>/reject", methods=["PUT"])
def reject_verification(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE user_details
            SET verify_status = 'Rejected'
            WHERE user_id = %s
        """, (user_id,))

        if cur.rowcount == 0:
            return jsonify({
                "message": "User not found"
            }), 404

        conn.commit()

        # Notify the user
        socketio.emit(
            "verification_updated",
            {
                "user_id": user_id,
                "status": "Rejected"
            },
            room=f"user_{user_id}"
        )

        # Notify all admin dashboards
        socketio.emit(
            "verification_updated",
            {
                "user_id": user_id,
                "status": "Rejected",
                "message": "A user was rejected."
            },
            room="admins"
        )

        return jsonify({
            "message": "User rejected successfully"
        }), 200

    except Exception as e:
        conn.rollback()

        return jsonify({
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()