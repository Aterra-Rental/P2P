import React from "react";
import "./InvitationCard.css";
const InvitationCard = ({
    invitation,
    onAccept,
    onReject,
}) => {
    return (
        <div className="invitation-card">
            <div className="invitation-body">

                <h5 className="invitation-title">
                    {invitation.item_name}
                </h5>

                <p className="invitation-from">
                    From: {invitation.creator_name}
                </p>

                <p className="invitation-description">
                    {invitation.item_description}
                </p>

                <h6 className="invitation-price">
                    ${invitation.agreed_price}
                </h6>

                <span className="status-badge">
                    {invitation.status}
                </span>

                <div className="action-row">
                    <button
                        className="accept-btn"
                        onClick={() => onAccept(invitation.room_code)}
                    >
                        Accept
                    </button>

                    <button
                        className="reject-btn"
                        onClick={() => onReject(invitation.room_code)}
                    >
                        Reject
                    </button>
                </div>

            </div>
        </div>
    );
};

export default InvitationCard;