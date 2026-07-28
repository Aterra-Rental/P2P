import React from "react";
import "./DealHeader.css";

const DealHeader = ({ room }) => {
    return (
        <div className="deal-header">

            <div className="deal-header-title">
                <h2>{room.item_name}</h2>
            </div>

            <div className="deal-header-grid">

                <div className="deal-info-card">
                    <span>Room Code</span>
                    <h5>{room.room_code}</h5>
                </div>

                <div className="deal-info-card">
                    <span>Status</span>
                    <div className={`deal-status ${room.status.toLowerCase()}`}>
                        {room.status}
                    </div>
                </div>

                <div className="deal-info-card">
                    <span>Deal Amount</span>
                    <h5>
                        ${Number(room.agreed_price).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </h5>
                </div>

                <div className="deal-info-card">
                    <span>Created</span>
                    <h5>
                        {new Date(room.created_at).toLocaleDateString()}
                    </h5>
                </div>

            </div>

        </div>
    );
};

export default DealHeader;