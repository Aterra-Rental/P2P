import React from "react";
import "./InvitationCard.css";
const InvitationCard = ({ invitation, onAccept, onReject }) => {
  console.log({
    onAccept,
    onReject,
  });
  const handleReject = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this invitation?",
    );

    if (!confirmed) {
      return;
    }

    onReject(invitation.room_code);
  };
  const handleAccept = () => {
    const confirmed = window.confirm(
      "Are you sure you want to accept this invitation?",
    );

    if (!confirmed) {
      return;
    }

    onAccept(invitation.room_code);
  };
  return (
    <div className="invitation-card">
      <div className="invitation-body">
        <h5 className="invitation-title">{invitation.item_name}</h5>

        <p className="invitation-from">From: {invitation.creator_name}</p>

        <p className="invitation-description">{invitation.item_description}</p>

        <h6 className="invitation-price">${invitation.agreed_price}</h6>

        <span className="status-badge">{invitation.status}</span>

        <div className="action-row">
          <button className="accept-btn" onClick={handleAccept}>
            Accept
          </button>

          <button className="reject-btn" onClick={handleReject}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationCard;
