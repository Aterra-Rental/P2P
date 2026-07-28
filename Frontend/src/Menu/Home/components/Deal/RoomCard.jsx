import React from "react";
import "./RoomCard.css";
import { reinviteRoom } from "../../lib/room"
const RoomCard = ({ room, currentUserId, onOpen }) => {

    const partnerId =
        room.created_by === Number(currentUserId)
            ? room.invited_user_id
            : room.created_by;

    const handleReinvite = async () => {
        try {
            const result = await reinviteRoom(
                room.room_code,
                currentUserId
            );

            if (!result.success) {
                alert(result.message);
                return;
            }

            alert(result.message);

        } catch (err) {
            console.error(err);
            alert("Failed to re-invite.");
        }
    };
    console.log("ROOM:", room);
console.log("currentUserId:", currentUserId);
console.log(
    room.status,
    room.created_by,
    room.reinvite_count,
    room.max_reinvites
);


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
                            <strong>Amount:</strong> $ {room.agreed_price} 
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
                            {
                                room.status === "Rejected" &&
                                room.created_by === Number(currentUserId) &&
                                room.reinvite_count < room.max_reinvites && (
                                    <button
                                        className="btn btn-warning mt-2"
                                        onClick={handleReinvite}
                                    >
                                        Re-invite ({room.max_reinvites - room.reinvite_count} left)
                                    </button>
                                )
                            }
                    </div>

                </div>

            </div>

        </div>
    );
};

export default RoomCard;