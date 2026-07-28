from flask import Blueprint, request, jsonify
from database import get_db
import random
import string
from socketio_instance import socketio
room_bp = Blueprint("room", __name__)


# ------------------------------------------------------
# Generate Unique Room Code
# ------------------------------------------------------

def generate_room_code(length=6):
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            "SELECT room_id FROM room WHERE room_code = %s",
            (code,)
        )

        exists = cur.fetchone()

        cur.close()
        conn.close()

        if not exists:
            return code


# ======================================================
# CHECK USER EXISTS
# ======================================================
# @room_bp.route("/check-user/<int:user_id>", methods=["GET"])
# def check_user():

#     user_id = request.view_args["user_id"]

#     conn = get_db()
#     cur = conn.cursor()

#     try:

#         cur.execute("""
#             SELECT
#                 user_id,
#                 firstname,
#                 lastname,
#                 verify_status
#             FROM user_details
#             WHERE user_id=%s
#         """, (user_id,))

#         user = cur.fetchone()

#         if not user:
#             return jsonify({
#                     "success": False,
#                     "message": "User ID not found."
#                 }), 404    

#         return jsonify({
#                 "success": True,
#                 "user": {
#                     "user_id": user[0],
#                     "firstname": user[1],
#                     "lastname": user[2],
#                     "verify_status": user[3]
#                 }
#             }), 200
            

#     finally:
#         cur.close()
#         conn.close()

@room_bp.route("/check-user/<int:user_id>", methods=["GET"])
def check_user(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                user_id,
                firstname,
                lastname,
                verify_status
            FROM user_details
            WHERE user_id = %s
        """, (user_id,))

        user = cur.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User ID not found."
            }), 404

        return jsonify({
            "success": True,
            "user": {
                "user_id": user[0],
                "firstname": user[1],
                "lastname": user[2],
                "verify_status": user[3]
            }
        }), 200

    except Exception as e:
        import traceback

        # Print full traceback in the Flask terminal
        traceback.print_exc()

        # Return the exact error to the frontend (development only)
        return jsonify({
            "success": False,
            "error": type(e).__name__,
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()
# ======================================================
# CREATE ROOM INVITATION
# ======================================================
@room_bp.route("/rooms/", methods=["POST"])
def create_room():

    data = request.json

    conn = get_db()
    cur = conn.cursor()

    try:

        room_code = generate_room_code()
        print("Incoming room data:", data)
        cur.execute("""
            INSERT INTO room
            (
                room_code,
                created_by,
                invited_user_id,
                item_name,
                item_description,
                agreed_price,
                status,
                reinvite_count,
                max_reinvites
            )
            VALUES
            (%s,%s,%s,%s,%s,%s,'Waiting',0,3)
            RETURNING room_id
        """,(
            room_code,
            data["created_by"],
            data["invited_user_id"],
            data["item_name"],
            data["item_description"],
            data["agreed_price"]
        ))

        room_id = cur.fetchone()[0]

        conn.commit()
        socketio.emit(
            "room_updated",
            room=f"user_{data['created_by']}")

        socketio.emit(
            "room_updated",
            room=f"user_{data['invited_user_id']}")
        return jsonify({
            "success":True,
            "room_id":room_id,
            "room_code":room_code,
            "message":"Invitation sent successfully."
        }),201

    except Exception as e:

        conn.rollback()

        return jsonify({
            "success":False,
            "error":str(e)
        }),500

    finally:
        cur.close()
        conn.close()

    

# ======================================================
# GET ALL ROOMS FOR A USER
# ======================================================
@room_bp.route("/rooms/", methods=["GET"])
def get_rooms():

    user_id = request.args.get("user_id")

    if not user_id:

        return jsonify({
            "success": False,
            "message": "User ID is required."
        }), 400

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("""
            SELECT
            room_id,
            room_code,
            created_by,
            invited_user_id,
            item_name,
            item_description,
            agreed_price,

            escrow_fee,
            total_paid,

            status,
            payment_status,
            shipping_status,

            courier_name,
            tracking_number,

            reinvite_count,
            max_reinvites,
            created_at,
            completed_at
                    FROM room
                    WHERE
                created_by = %s
            OR (
                invited_user_id = %s
                AND status <> 'Rejected'
            )
        ORDER BY created_at DESC
        """, (user_id, user_id))

        rooms = cur.fetchall()

        result = []

        for room in rooms:

            result.append({
                "room_id": room[0],
                "room_code": room[1],
                "created_by": room[2],
                "partner_user_id": room[3] if str(room[2]) == str(user_id) else room[2],

                "item_name": room[4],
                "item_description": room[5],
                "agreed_price": float(room[6]) if room[6] else 0,

                "escrow_fee": float(room[7]) if room[7] else 0,
                "total_paid": float(room[8]) if room[8] else 0,

                "status": room[9],
                "payment_status": room[10],
                "shipping_status": room[11],

                "courier_name": room[12],
                "tracking_number": room[13],

                "reinvite_count": room[14],
                "max_reinvites": room[15],

                "created_at": room[16],
                "completed_at": room[17],
            })

        return jsonify({
            "success": True,
            "rooms": result
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


# ======================================================
# GET INVITATIONS
# ======================================================
@room_bp.route("/rooms/invitations/<int:user_id>", methods=["GET"])
def get_invitations(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("""
            SELECT
                r.room_id,
                r.room_code,
                r.created_by,
                CONCAT(u.firstname, ' ', u.lastname) AS creator_name,
                r.item_name,
                r.item_description,
                r.agreed_price,
                r.status,
                r.created_at
            FROM room r
            JOIN user_details u
                ON r.created_by = u.user_id
            WHERE r.invited_user_id = %s
            AND r.status = 'Waiting'
            ORDER BY r.created_at DESC
        """, (user_id,))

        invitations = []

        for row in cur.fetchall():

            invitations.append({
                "room_id": row[0],
                "room_code": row[1],
                "created_by": row[2],
                "creator_name": row[3],
                "item_name": row[4],
                "item_description": row[5],
                "agreed_price": float(row[6]) if row[6] else 0,
                "status": row[7],
                "created_at": row[8]
            })

        return jsonify({
            "success": True,
            "count": len(invitations),
            "invitations": invitations
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()
# ======================================================
# GET SINGLE ROOM
# ======================================================


@room_bp.route("/rooms/<room_code>/", methods=["GET"])
def get_room(room_code):

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("""
            SELECT
                room_id,
                room_code,

                created_by,
                invited_user_id,

                item_name,
                item_description,
                agreed_price,

                escrow_fee,
                total_paid,

                status,
                payment_status,
                shipping_status,

                courier_name,
                tracking_number,

                bakong_transaction_id,
                payment_verified_at,
                payment_provider,

                cancel_requested_by,
                cancel_reason,

                created_at,
                completed_at

            FROM room
            WHERE room_code = %s
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        columns = [desc[0] for desc in cur.description]

        return jsonify({
            "success": True,
            "room": dict(zip(columns, room))
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()

@room_bp.route("/rooms/<room_code>/", methods=["PATCH"])
def update_room(room_code):

    data = request.json

    conn = get_db()
    cur = conn.cursor()

    try:

        updates = []
        values = []

        for key, value in data.items():
            updates.append(f"{key}=%s")
            values.append(value)

        values.append(room_code)

        sql = f"""
            UPDATE room
            SET {', '.join(updates)}
            WHERE room_code=%s
        """

        cur.execute(sql, values)

        conn.commit()

        return jsonify({
            "success": True
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }),500

    finally:
        cur.close()
        conn.close()


# ======================================================
# ACCEPT INVITATION
# ======================================================

@room_bp.route("/rooms/<room_code>/accept", methods=["POST"])
def accept_room(room_code):

    data = request.json
    user_id = data.get("user_id")

    conn = get_db()
    cur = conn.cursor()

    try:

        # Check room exists
        # Check room exists
        cur.execute("""
            SELECT
                created_by,
                invited_user_id,
                status
            FROM room
            WHERE room_code = %s
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        created_by, invited_user_id, status = room

        # Only invited user can accept
        if int(invited_user_id) != int(user_id):
            return jsonify({
                "success": False,
                "message": "Only the invited user can accept this invitation."
            }), 403

        # Room must still be waiting
        if status != "Waiting":
            return jsonify({
                "success": False,
                "message": f"Room is already {status}."
            }), 400

        # Accept invitation
        cur.execute("""
            UPDATE room
            SET status='Accepted'
            WHERE room_code=%s
        """, (room_code,))

        conn.commit()
        # Refresh DealHub for creator
        socketio.emit(
         "room_updated",
        room=f"user_{created_by}"
        )
        # Refresh DealHub for invited user
        socketio.emit(
            "room_updated",
            room=f"user_{invited_user_id}"
        )
        # Refresh anyone currently inside this DealWorkspace
        socketio.emit(
            "room_updated",
            {
                "room_code": room_code
            },
            room=f"deal_{room_code}"
        )

        return jsonify({
            "success": True,
            "message": "Invitation accepted."
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()

# ======================================================
# REJECT INVITATION
# ======================================================
@room_bp.route("/rooms/<room_code>/reject", methods=["POST"])
def reject_room(room_code):

    data = request.json
    user_id = data.get("user_id")

    conn = get_db()
    cur = conn.cursor()

    try:

        # Check room exists
        # Check room exists
        cur.execute("""
            SELECT
                created_by,
                invited_user_id,
                status
            FROM room
            WHERE room_code = %s
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        created_by, invited_user_id, status = room

        # Only invited user can reject
        if int(invited_user_id) != int(user_id):
            return jsonify({
                "success": False,
                "message": "Only the invited user can reject this invitation."
            }), 403

        # Must still be waiting
        if status != "Waiting":
            return jsonify({
                "success": False,
                "message": f"Room is already {status}."
            }), 400

        # Reject invitation
        cur.execute("""
            UPDATE room
            SET status='Rejected'
            WHERE room_code=%s
        """, (room_code,))

        conn.commit()

        socketio.emit(
            "room_updated",
            room=f"user_{created_by}"
        )

        socketio.emit(
            "room_updated",
            room=f"user_{invited_user_id}"
        )
        socketio.emit(
            "room_updated",
            {
                "room_code": room_code
            },
            room=f"deal_{room_code}"
        )

        return jsonify({
            "success": True,
            "message": "Invitation rejected."
        })

    except Exception as e:
        conn.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


# ======================================================
# RE-INVITE
# ======================================================

@room_bp.route("/rooms/<room_code>/reinvite", methods=["POST"])
def reinvite_room(room_code):

    data = request.json
    user_id = data.get("user_id")

    conn = get_db()
    cur = conn.cursor()

    try:

        # Get room information
        cur.execute("""
            SELECT
                created_by,
                invited_user_id,
                status,
                reinvite_count,
                max_reinvites
            FROM room
            WHERE room_code = %s
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        (
            created_by,
            invited_user_id,
            status,
            reinvite_count,
            max_reinvites
        ) = room

        # Only creator can re-invite
        if int(created_by) != int(user_id):
            return jsonify({
                "success": False,
                "message": "Only the creator can re-invite."
            }), 403

        # Must be rejected
        if status != "Rejected":
            return jsonify({
                "success": False,
                "message": "Only rejected deals can be re-invited."
            }), 400

        # Limit reached
        if reinvite_count >= max_reinvites:
            return jsonify({
                "success": False,
                "message": "Maximum re-invites reached."
            }), 400

        # Update room
        cur.execute("""
            UPDATE room
            SET
                status = 'Waiting',
                reinvite_count = reinvite_count + 1
            WHERE room_code = %s
        """, (room_code,))

        conn.commit()

        # Refresh DealHub for creator
        socketio.emit(
            "room_updated",
            room=f"user_{created_by}"
        )

        # Refresh DealHub for invited user
        socketio.emit(
            "room_updated",
            room=f"user_{invited_user_id}"
        )

        # Refresh DealWorkspace if open
        socketio.emit(
            "room_updated",
            {"room_code": room_code},
            room=f"deal_{room_code}"
        )

        return jsonify({
            "success": True,
            "message": "Invitation sent again successfully."
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()




@room_bp.route("/rooms/<room_code>/", methods=["DELETE"])
def delete_room(room_code):

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute("""
            DELETE
            FROM room
            WHERE room_code=%s
        """,(room_code,))

        conn.commit()

        return jsonify({
            "success":True
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error":str(e)
        }),500

    finally:
        cur.close()
        conn.close()

    
        