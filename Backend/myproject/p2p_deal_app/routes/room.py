from flask import Blueprint, g, jsonify, request
from services.auth_required import login_required
from database import get_db
import random
import string
import traceback
from datetime import datetime, timedelta
from socketio_instance import socketio
room_bp = Blueprint("room", __name__)







def emit_room_updated(
    room_code,
    created_by,
    invited_user_id,
    status=None,
    deleted=False,
):
    socket_data = {
        "room_code": room_code,
        "status": status,
        "deleted": deleted,
    }

    socketio.emit(
        "room_updated",
        socket_data,
        room=f"user_{created_by}",
    )

    socketio.emit(
        "room_updated",
        socket_data,
        room=f"user_{invited_user_id}",
    )


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


@room_bp.route("/check-user/<int:user_id>", methods=["GET"])
@login_required
def check_user(user_id):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
                """
                SELECT
                    details.user_id,
                    details.firstname,
                    details.lastname,
                    details.verify_status,
                    login.email
                FROM user_details details
                JOIN user_login login
                    ON login.user_id = details.user_id
                WHERE details.user_id = %s
                """,
                (user_id,),
            )

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
                "verify_status": user[3],
                "email": user[4],
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

    data = request.get_json(silent=True) or {}
    required_fields = [
    "created_by",
    "invited_user_id",
    "item_name",
    "agreed_price",
    ]
    product_type = str(
    data.get("product_type", "Physical")
    ).strip().title()
    if product_type not in ["Physical", "Digital"]:
        return jsonify({
            "success": False,
            "message": (
                "Product type must be Physical or Digital."
            ),
        }), 400
    data["item_name"] = data["item_name"].strip()

    if not data["item_name"]:
        return jsonify({
        "success": False,
        "message": "Item name cannot be empty."
        }), 400
    for field in required_fields:
        if not data.get(field):
            return jsonify({
            "success": False,
            "message": f"{field} is required."
        }), 400
    if str(data["created_by"]) == str(data["invited_user_id"]):
        return jsonify({
        "success": False,
        "message": "You cannot create a deal with yourself."
    }), 400

    try:
        amount = float(data["agreed_price"])

        if amount <= 0:
            return jsonify({
                "success": False,
                "message": "Amount must be greater than zero."
            }), 400

    except ValueError:
            return jsonify({
            "success": False,
            "message": "Invalid amount."
            }), 400
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
        SELECT verify_status
        FROM user_details
        WHERE user_id = %s
        """, (data["created_by"],))

        creator = cur.fetchone()

        if not creator:
            return jsonify({
                "success": False,
                "message": "Creator profile not found."
            }), 404

        if creator[0] != "Verified":
            return jsonify({
                "success": False,
                "message": "Creator is not verified."
            }), 403
        cur.execute("""
            SELECT verify_status
            FROM user_details
            WHERE user_id = %s
        """, (data["invited_user_id"],))

        partner = cur.fetchone()

        if not partner:
            return jsonify({
                "success": False,
                "message": "Partner not found."
            }), 404

        if partner[0] != "Verified":
            return jsonify({
                "success": False,
                "message": "Partner is not verified."
            }), 403

        cur.execute("""
            SELECT room_id
            FROM room
            WHERE (
                (
                    created_by = %s
                    AND invited_user_id = %s
                )
                OR
                (
                    created_by = %s
                    AND invited_user_id = %s
                )
            )
            AND status = 'Waiting'
        """, (
            data["created_by"],
            data["invited_user_id"],
            data["invited_user_id"],
            data["created_by"]
        ))

        existing_room = cur.fetchone()

        if existing_room:
            return jsonify({
                "success": False,
                "message": "You already have a pending invitation for this user."
            }), 400
        room_code = generate_room_code()

        cur.execute("""
                INSERT INTO room
                (
                    room_code,
                    created_by,
                    invited_user_id,
                    item_name,
                    item_description,
                    agreed_price,
                    product_type,
                    status
                )
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, 'Waiting')
                RETURNING room_id
            """, (
                room_code,
                data["created_by"],
                data["invited_user_id"],
                data["item_name"],
                data.get("item_description", ""),
                data["agreed_price"],
                product_type,
            ))

        room_id = cur.fetchone()[0]

        conn.commit()
        emit_room_updated(
            room_code=room_code,
            created_by=data["created_by"],
            invited_user_id=data["invited_user_id"],
            status="Waiting",
        )
        return jsonify({
            "success":True,
            "room_id":room_id,
            "room_code":room_code,
            "product_type": product_type,
            "message":"Invitation sent successfully."
        }),201
    except Exception as e:

        conn.rollback()
        traceback.print_exc()

        return jsonify({
        "success": False,
        "error": str(e),
        "message": str(e)
        }), 500

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
                r.room_id,
                r.room_code,
                r.created_by,
                r.invited_user_id,
                CONCAT(c.firstname, ' ', c.lastname) AS creator_name,
                CONCAT(i.firstname, ' ', i.lastname) AS invited_name,
                r.item_name,
                r.item_description,
                r.agreed_price,
                r.status,
                r.created_at,
                r.payment_status,
                r.reinvite_count,
                r.max_reinvites,

                EXISTS (
                    SELECT 1
                    FROM room_reminders rr
                    WHERE rr.room_id = r.room_id
                    AND rr.receiver_id = %s
                    AND rr.is_read = FALSE
                ) AS has_unread_reminder

            FROM room r

            JOIN user_details c
                ON r.created_by = c.user_id

            JOIN user_details i
                ON r.invited_user_id = i.user_id

            WHERE (
                r.created_by = %s
                OR r.invited_user_id = %s
            )
            AND r.status NOT IN (
                'Completed',
                'Cancelled'
            )

            ORDER BY r.created_at DESC
        """, (user_id, user_id, user_id))

        rooms = cur.fetchall()

        result = []

        for room in rooms:

            result.append({
                "room_id": room[0],
                "room_code": room[1],
                "created_by": room[2],
                "invited_user_id": room[3],

                "creator_name": room[4],
                "invited_name": room[5],

                "partner_user_id": (
                    room[3]
                    if str(room[2]) == str(user_id)
                    else room[2]
                ),

                "partner_name": (
                    room[5]
                    if str(room[2]) == str(user_id)
                    else room[4]
                ),

                "item_name": room[6],
                "item_description": room[7],
                "agreed_price": float(room[8]) if room[8] else 0,
                "status": room[9],
                "created_at": room[10],
                "payment_status": room[11],
                "reinvite_count": room[12],
                "max_reinvites": room[13],
                "has_unread_reminder": room[14]
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
@login_required
def get_invitations(user_id):
    if int(g.current_user_id) != int(user_id):
        return jsonify({
            "success": False,
            "message": (
                "You cannot view another user's invitations."
            ),
    }), 403

    conn = get_db()
    cur = conn.cursor()

    try:

        cur.execute(
            """
            SELECT
                r.room_id,
                r.room_code,
                r.created_by,
                CONCAT(
                    details.firstname,
                    ' ',
                    details.lastname
                ) AS creator_name,
                login.email,
                r.item_name,
                r.item_description,
                r.product_type,
                r.agreed_price,
                r.status,
                r.created_at
            FROM room r
            JOIN user_details details
                ON details.user_id = r.created_by
            JOIN user_login login
                ON login.user_id = r.created_by
            WHERE r.invited_user_id = %s
            AND r.status = 'Waiting'
            ORDER BY r.created_at DESC
            """,
            (user_id,),
        )

        invitations = []

        for row in cur.fetchall():

           invitations.append({
                "room_id": row[0],
                "room_code": row[1],
                "created_by": row[2],
                "creator_name": row[3],
                "creator_email": row[4],
                "item_name": row[5],
                "item_description": row[6],
                "product_type": row[7],
                "agreed_price": (
                    float(row[8]) if row[8] else 0
                ),
                "status": row[9],
                "created_at": row[10],
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
    r.room_id,
    r.room_code,
    r.created_by,
    r.invited_user_id,
    r.item_name,
    r.item_description,
    r.agreed_price,
    r.product_type,
    r.status,
    r.current_step,
    r.created_at,
    r.payment_status,
    r.bakong_transaction_id,
    r.payment_verified_at,
    r.payment_provider,

    b.buyer_id,
    COALESCE(b.ready, FALSE) AS buyer_ready,
    COALESCE(b.amount_confirmed, FALSE) AS buyer_amount_confirmed,

    s.seller_id,
    COALESCE(s.ready, FALSE) AS seller_ready,
    COALESCE(s.amount_confirmed, FALSE) AS seller_amount_confirmed

FROM room r

LEFT JOIN buyer b
    ON b.room_id = r.room_id

LEFT JOIN seller s
    ON s.room_id = r.room_id

WHERE r.room_code = %s
        """, (room_code,))

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }), 404

        columns = [desc[0] for desc in cur.description]
        dict(zip(columns, room))
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
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

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

        if str(invited_user_id) != str(user_id):
            return jsonify({
                "success": False,
                "message": "Only the invited user can accept this room."
            }), 403

        if status != "Waiting":
            return jsonify({
                "success": False,
                "message": "This invitation is no longer waiting."
            }), 400

        cur.execute("""
            UPDATE room
            SET status = 'Accepted'
            WHERE room_code = %s
        """, (room_code,))

        conn.commit()

        emit_room_updated(
            room_code=room_code,
            created_by=created_by,
            invited_user_id=invited_user_id,
            status="Accepted",
        )

        return jsonify({
            "success": True,
            "message": "Invitation accepted."
        }), 200

    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


# ======================================================
# REJECT INVITATION
# ======================================================
@room_bp.route("/rooms/<room_code>/reject", methods=["POST"])
def reject_room(room_code):
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

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

        if str(invited_user_id) != str(user_id):
            return jsonify({
                "success": False,
                "message": "Only the invited user can reject this room."
            }), 403

        if status != "Waiting":
            return jsonify({
                "success": False,
                "message": "This invitation is no longer waiting."
            }), 400

        cur.execute("""
            UPDATE room
            SET status = 'Rejected'
            WHERE room_code = %s
        """, (room_code,))

        conn.commit()

        emit_room_updated(
            room_code=room_code,
            created_by=created_by,
            invited_user_id=invited_user_id,
            status="Rejected",
        )

        return jsonify({
            "success": True,
            "message": "Invitation rejected."
        }), 200

    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()


@room_bp.route("/rooms/<room_code>/", methods=["DELETE"])
@login_required
def delete_room(room_code):
    user_id = g.current_user_id

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT
                created_by,
                invited_user_id,
                status
            FROM room
            WHERE room_code = %s
            FOR UPDATE
            """,
            (room_code,),
        )

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found.",
            }), 404

        created_by, invited_user_id, status = room

        if int(created_by) != int(user_id):
            return jsonify({
                "success": False,
                "message": (
                    "Only the room creator can cancel "
                    "this invitation."
                ),
            }), 403

        if status not in {"Waiting", "Rejected"}:
            return jsonify({
                "success": False,
                "message": (
                    "Only waiting or rejected rooms "
                    "can be deleted."
                ),
            }), 409

        cur.execute(
            """
            DELETE FROM room
            WHERE room_code = %s
            """,
            (room_code,),
        )

        conn.commit()

        emit_room_updated(
            room_code=room_code,
            created_by=created_by,
            invited_user_id=invited_user_id,
            status="Deleted",
            deleted=True,
        )

        return jsonify({
            "success": True,
            "message": (
                "Invitation cancelled successfully."
                if status == "Waiting"
                else "Rejected room deleted successfully."
            ),
        }), 200

    except Exception as error:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": "Unable to delete this room.",
            "error": str(error),
        }), 500

    finally:
        cur.close()
        conn.close()


# ======================================================
# RE-INVITE USER
# ======================================================
@room_bp.route("/rooms/<room_code>/reinvite", methods=["POST"])
def reinvite_room(room_code):

    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

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

        created_by = room[0]
        invited_user_id = room[1]
        status = room[2]
        reinvite_count = room[3]
        max_reinvites = room[4]

        if str(created_by) != str(user_id):
            return jsonify({
                "success": False,
                "message": "Only the room creator can re-invite."
            }), 403

        if status != "Rejected":
            return jsonify({
                "success": False,
                "message": "Only rejected rooms can be re-invited."
            }), 400

        if reinvite_count >= max_reinvites:
            return jsonify({
                "success": False,
                "message": "Maximum re-invite limit reached."
            }), 400

        cur.execute("""
            UPDATE room
            SET
                status = 'Waiting',
                reinvite_count = reinvite_count + 1
            WHERE room_code = %s
            RETURNING reinvite_count
        """, (room_code,))

        updated_count = cur.fetchone()[0]

        conn.commit()

        emit_room_updated(
            room_code=room_code,
            created_by=created_by,
            invited_user_id=invited_user_id,
            status="Waiting",
        )

        return jsonify({
            "success": True,
            "message": "Invitation sent again.",
            "invited_user_id": invited_user_id,
            "reinvite_count": updated_count,
            "remaining_reinvites": max_reinvites - updated_count
        }), 200

    except Exception as e:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e),
            "message": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()
from datetime import datetime, timedelta





@room_bp.route("/rooms/<room_code>/remind", methods=["POST"])
@login_required
def remind_partner(room_code):
    sender_id = g.current_user_id

    conn = get_db()
    cur = conn.cursor()

    try:

        # ------------------------------------
        # Find room
        # ------------------------------------

        cur.execute(
                """
                SELECT
                    room_id,
                    created_by,
                    invited_user_id,
                    status,
                    current_step
                FROM room
                WHERE room_code = %s
                """,
                (room_code,),
            )

        room = cur.fetchone()

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found."
            }),404

        room_id = room[0]
        creator = room[1]
        invited = room[2]
        status = room[3]
        current_step = room[4]

        if (
            status in {"Completed", "Cancelled"}
            or current_step in {"Completed", "Cancelled"}
        ):
            return jsonify({
                "success": False,
                "message": (
                    "Reminders are unavailable because "
                    "this deal has ended."
                ),
            }), 409

        # ------------------------------------
        # Determine receiver
        # ------------------------------------

        if str(sender_id) == str(creator):
            receiver_id = invited

        elif str(sender_id) == str(invited):
            receiver_id = creator

        else:
            return jsonify({
                "success": False,
                "message": "You are not part of this room."
            }),403

        # ------------------------------------
        # Cooldown check
        # ------------------------------------

        cur.execute(
                """
                SELECT created_at
                FROM room_reminders
                WHERE room_id = %s
                AND sender_id = %s
                AND is_read = FALSE
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (room_id, sender_id),
            )

        last = cur.fetchone()

        if last:

            last_time = last[0]

            if datetime.now() - last_time < timedelta(minutes=10):

                remaining = timedelta(minutes=10) - (datetime.now() - last_time)

                minutes = int(remaining.total_seconds() // 60)
                seconds = int(remaining.total_seconds() % 60)

                return jsonify({
                    "success": False,
                    "message": f"Please wait {minutes}m {seconds}s before sending another reminder.",
                    "remaining_seconds": int(remaining.total_seconds())
                }), 429

        # ------------------------------------
        # Save reminder
        # ------------------------------------

        cur.execute("""
            INSERT INTO room_reminders
            (
                room_id,
                sender_id,
                receiver_id
            )
            VALUES
            (%s,%s,%s)
        """, (
            room_id,
            sender_id,
            receiver_id
        ))

        conn.commit()

        socketio.emit(
        "partner_reminded",
        {
            "room_code": room_code,
            "room_id": room_id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "message": "Your partner reminded you about this deal."
        },
        room=f"user_{receiver_id}"
    )

        return jsonify({
                "success": True,
                "message": "Reminder sent successfully."
            }), 200

    except Exception as e:

        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }),500

    finally:

        cur.close()
        conn.close()

@room_bp.route("/rooms/<room_code>/reminders/read", methods=["PUT"])
def mark_room_reminders_read(room_code):

    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "message": "User ID is required."
        }), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE room_reminders
            SET is_read = TRUE
            WHERE receiver_id = %s
              AND is_read = FALSE
              AND room_id = (
                    SELECT room_id
                    FROM room
                    WHERE room_code = %s
              )
        """, (user_id, room_code))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Reminder marked as read."
        }), 200

    except Exception as e:
        conn.rollback()
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        cur.close()
        conn.close()