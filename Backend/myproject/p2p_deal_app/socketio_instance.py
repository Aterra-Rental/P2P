from flask import request
from flask_socketio import (
    SocketIO,
    join_room,
    leave_room,
)

from database import get_db


socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="threading",
    ping_timeout=30,
    ping_interval=25,
)

# room_code -> user_id -> set of Socket.IO session IDs
deal_presence = {}

# Socket.IO session ID -> set of (room_code, user_id)
sid_memberships = {}


def emit_deal_presence(room_code):
    users = deal_presence.get(room_code, {})

    socketio.emit(
        "deal_presence_updated",
        {
            "room_code": room_code,
            "participant_count": len(users),
            "both_present": len(users) >= 2,
        },
        room=f"deal_{room_code}",
    )


def remove_deal_presence(sid, room_code, user_id):
    room_users = deal_presence.get(room_code)

    if not room_users:
        return

    user_connections = room_users.get(user_id)

    if user_connections:
        user_connections.discard(sid)

        if not user_connections:
            room_users.pop(user_id, None)

    if not room_users:
        deal_presence.pop(room_code, None)


def user_belongs_to_room(room_code, user_id):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT 1
            FROM room
            WHERE room_code = %s
              AND (
                created_by = %s
                OR invited_user_id = %s
              )
            """,
            (room_code, user_id, user_id),
        )

        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()


@socketio.on("connect")
def handle_connect():
    print("Client connected")


@socketio.on("join_admin")
def handle_join_admin():
    join_room("admins")
    print("Admin joined Socket.IO room: admins")


@socketio.on("join_user")
def handle_join_user(data):
    user_id = data.get("user_id")

    if user_id:
        join_room(f"user_{user_id}")
        print(f"User {user_id} joined room user_{user_id}")


@socketio.on("join_deal")
def handle_join_deal(data):
    room_code = str(data.get("room_code", "")).strip()
    user_id = str(data.get("user_id", "")).strip()

    if not room_code or not user_id:
        return

    if not user_belongs_to_room(room_code, user_id):
        print(
            f"Rejected deal-room join: "
            f"user {user_id}, room {room_code}"
        )
        return

    sid = request.sid

    join_room(f"deal_{room_code}")

    room_users = deal_presence.setdefault(room_code, {})
    user_connections = room_users.setdefault(user_id, set())
    user_connections.add(sid)

    sid_memberships.setdefault(sid, set()).add(
        (room_code, user_id)
    )

    print(
        f"User {user_id} joined deal room: "
        f"deal_{room_code}"
    )

    emit_deal_presence(room_code)


@socketio.on("leave_deal")
def handle_leave_deal(data):
    room_code = str(data.get("room_code", "")).strip()
    user_id = str(data.get("user_id", "")).strip()
    sid = request.sid

    if not room_code or not user_id:
        return

    leave_room(f"deal_{room_code}")

    remove_deal_presence(sid, room_code, user_id)

    memberships = sid_memberships.get(sid)

    if memberships:
        memberships.discard((room_code, user_id))

        if not memberships:
            sid_memberships.pop(sid, None)

    emit_deal_presence(room_code)


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    memberships = sid_memberships.pop(sid, set())

    for room_code, user_id in memberships:
        remove_deal_presence(sid, room_code, user_id)
        emit_deal_presence(room_code)

    print("Client disconnected")
socketio = SocketIO(cors_allowed_origins="*")

# room_code -> user_id -> set of Socket.IO session IDs
deal_presence = {}

# Socket.IO session ID -> set of (room_code, user_id)
sid_memberships = {}


def emit_deal_presence(room_code):
    users = deal_presence.get(room_code, {})

    socketio.emit(
        "deal_presence_updated",
        {
            "room_code": room_code,
            "participant_count": len(users),
            "both_present": len(users) >= 2,
        },
        room=f"deal_{room_code}",
    )


def remove_deal_presence(sid, room_code, user_id):
    room_users = deal_presence.get(room_code)

    if not room_users:
        return

    user_connections = room_users.get(user_id)

    if user_connections:
        user_connections.discard(sid)

        if not user_connections:
            room_users.pop(user_id, None)

    if not room_users:
        deal_presence.pop(room_code, None)


def user_belongs_to_room(room_code, user_id):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT 1
            FROM room
            WHERE room_code = %s
              AND (
                created_by = %s
                OR invited_user_id = %s
              )
            """,
            (room_code, user_id, user_id),
        )

        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()


@socketio.on("connect")
def handle_connect():
    print("Client connected")


@socketio.on("join_admin")
def handle_join_admin():
    join_room("admins")
    print("Admin joined Socket.IO room: admins")


@socketio.on("join_user")
def handle_join_user(data):
    user_id = data.get("user_id")

    if user_id:
        join_room(f"user_{user_id}")
        print(f"User {user_id} joined room user_{user_id}")


@socketio.on("join_deal")
def handle_join_deal(data):
    room_code = str(data.get("room_code", "")).strip()
    user_id = str(data.get("user_id", "")).strip()

    if not room_code or not user_id:
        return

    if not user_belongs_to_room(room_code, user_id):
        print(
            f"Rejected deal-room join: "
            f"user {user_id}, room {room_code}"
        )
        return

    sid = request.sid

    join_room(f"deal_{room_code}")

    room_users = deal_presence.setdefault(room_code, {})
    user_connections = room_users.setdefault(user_id, set())
    user_connections.add(sid)

    sid_memberships.setdefault(sid, set()).add(
        (room_code, user_id)
    )

    print(
        f"User {user_id} joined deal room: "
        f"deal_{room_code}"
    )

    emit_deal_presence(room_code)


@socketio.on("leave_deal")
def handle_leave_deal(data):
    room_code = str(data.get("room_code", "")).strip()
    user_id = str(data.get("user_id", "")).strip()
    sid = request.sid

    if not room_code or not user_id:
        return

    leave_room(f"deal_{room_code}")

    remove_deal_presence(sid, room_code, user_id)

    memberships = sid_memberships.get(sid)

    if memberships:
        memberships.discard((room_code, user_id))

        if not memberships:
            sid_memberships.pop(sid, None)

    emit_deal_presence(room_code)


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    memberships = sid_memberships.pop(sid, set())

    for room_code, user_id in memberships:
        remove_deal_presence(sid, room_code, user_id)
        emit_deal_presence(room_code)

    print("Client disconnected")
