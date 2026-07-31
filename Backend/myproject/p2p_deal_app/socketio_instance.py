from flask_socketio import SocketIO, join_room

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="threading",
    ping_timeout=30,
    ping_interval=25,
)
socketio = SocketIO(cors_allowed_origins="*")


@socketio.on("connect")
def handle_connect():
    print("Client connected")


@socketio.on("join_admin")
def handle_join_admin():
    join_room("admins")
    print("Admin joined Socket.IO room: admins")

@socketio.on("join_user")
def handle_join(data):
    user_id = data.get("user_id")

    if user_id:
        join_room(f"user_{user_id}")
        print(f"User {user_id} joined room user_{user_id}")
@socketio.on("join_deal")
def handle_join_deal(data):
    room_code = data.get("room_code")

    if room_code:
        join_room(f"deal_{room_code}")
        print(f"User joined deal room: deal_{room_code}")
