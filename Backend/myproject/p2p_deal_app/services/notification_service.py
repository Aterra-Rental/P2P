from socketio_instance import socketio


ALLOWED_NOTIFICATION_TYPES = {
    "Announcement",
    "DealReminder",
    "InvitationAccepted",
    "InvitationRejected",
    "CancellationRequested",
    "CancellationRejected",
    "DealCancelled",
}


NOTIFICATION_RETURNING_COLUMNS = """
    notification_id,
    user_id,
    actor_user_id,
    notification_type,
    title,
    message,
    room_id,
    room_code,
    announcement_id,
    is_read,
    deleted_at,
    created_at
"""


def serialize_notification(row):
    return {
        "notification_id": row[0],
        "user_id": row[1],
        "actor_user_id": row[2],
        "notification_type": row[3],
        "title": row[4],
        "message": row[5],
        "room_id": row[6],
        "room_code": row[7],
        "announcement_id": row[8],
        "is_read": row[9],
        "deleted_at": (
            row[10].isoformat()
            if row[10]
            else None
        ),
        "created_at": (
            row[11].isoformat()
            if row[11]
            else None
        ),
    }


def create_user_notification(
    cursor,
    *,
    user_id,
    notification_type,
    title,
    message,
    actor_user_id=None,
    room_id=None,
    room_code=None,
    announcement_id=None,
):
    if notification_type not in (
        ALLOWED_NOTIFICATION_TYPES
    ):
        raise ValueError(
            "Unsupported notification type."
        )

    clean_title = str(title or "").strip()
    clean_message = str(message or "").strip()

    if not clean_title or not clean_message:
        raise ValueError(
            "Notification title and message are required."
        )

    cursor.execute(
        f"""
        INSERT INTO user_notifications (
            user_id,
            actor_user_id,
            notification_type,
            title,
            message,
            room_id,
            room_code,
            announcement_id
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        RETURNING {NOTIFICATION_RETURNING_COLUMNS}
        """,
        (
            int(user_id),
            (
                int(actor_user_id)
                if actor_user_id is not None
                else None
            ),
            notification_type,
            clean_title,
            clean_message,
            room_id,
            (
                str(room_code).strip()
                if room_code
                else None
            ),
            announcement_id,
        ),
    )

    return serialize_notification(
        cursor.fetchone()
    )


def create_announcement_notifications(
    cursor,
    *,
    announcement_id,
    title,
    message,
    created_at,
):
    cursor.execute(
        f"""
        INSERT INTO user_notifications (
            user_id,
            notification_type,
            title,
            message,
            announcement_id,
            created_at
        )
        SELECT
            login.user_id,
            'Announcement',
            %s,
            %s,
            %s,
            %s
        FROM user_login login
        ON CONFLICT (
            announcement_id,
            user_id
        )
        WHERE announcement_id IS NOT NULL
        DO NOTHING
        RETURNING {NOTIFICATION_RETURNING_COLUMNS}
        """,
        (
            str(title).strip(),
            str(message).strip(),
            int(announcement_id),
            created_at,
        ),
    )

    return [
        serialize_notification(row)
        for row in cursor.fetchall()
    ]


def emit_notifications_changed(user_ids):
    affected_user_ids = {
        int(user_id)
        for user_id in user_ids
        if user_id is not None
    }

    for user_id in affected_user_ids:
        socketio.emit(
            "notifications_changed",
            {
                "resource": "notifications",
            },
            to=f"user_{user_id}",
        )