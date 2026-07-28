import React from "react";
import "./RoomCard.css";
const RoomCard = ({ room, currentUserId, onOpen }) => {
    const partnerId =
        room.created_by === Number(currentUserId)
            ? room.invited_user_id
            : room.created_by;

    return (
        <div className="room-card">

            <div className="room-body">

                <div className="d-flex justify-content-between align-items-center">

                    <div>

                        <h5 className="room-title">
                            {room.item_name}
                        </h5>

                        <p className="room-info">
                            <strong>Room Code:</strong> {room.room_code}
                        </p>

                        <p className="room-info">
                            <strong>Partner ID:</strong> {partnerId}
                        </p>

                        <p className="room-info">
                            <strong>Amount:</strong> {room.agreed_price} ៛
                        </p>

                        <p className="mb-2">
                            <strong>Status:</strong>{" "}
                            <span className={`room-status ${room.status.toLowerCase()}`}>
                                {room.status}
                            </span>
                        </p>

                    </div>

                    <div>

                        <button
                            className="open-room-btn"
                             onClick={() => onOpen(room)}
                        >
                            Open Deal
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default RoomCard;