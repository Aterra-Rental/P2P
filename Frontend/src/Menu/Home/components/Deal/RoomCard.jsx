import React from "react";

const RoomCard = ({ room, currentUserId, onOpen }) => {

    const partnerId =
        room.created_by === Number(currentUserId)
            ? room.invited_user_id
            : room.created_by;

    return (
        <div className="card shadow-sm mb-3">

            <div className="card-body">

                <div className="d-flex justify-content-between align-items-center">

                    <div>

                        <h5 className="mb-2">
                            {room.item_name}
                        </h5>

                        <p className="mb-1">
                            <strong>Room Code:</strong> {room.room_code}
                        </p>

                        <p className="mb-1">
                            <strong>Partner ID:</strong> {partnerId}
                        </p>

                        <p className="mb-1">
                            <strong>Amount:</strong> {room.agreed_price} ៛
                        </p>

                        <p className="mb-2">
                            <strong>Status:</strong>{" "}
                            <span
                                className={
                                    room.status === "Completed"
                                        ? "text-success"
                                        : room.status === "Cancelled"
                                        ? "text-danger"
                                        : "text-warning"
                                }
                            >
                                {room.status}
                            </span>
                        </p>

                    </div>

                    <div>

                        <button
                            className="btn btn-primary"
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