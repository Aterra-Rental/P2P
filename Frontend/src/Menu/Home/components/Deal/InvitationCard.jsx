import "./InvitationCard.css";

const InvitationCard = ({
  invitation,
  onAccept,
  onReject,
}) => {
  const handleReject = () => {
    const confirmed = window.confirm(
      "Reject this deal invitation?",
    );

    if (confirmed) {
      onReject(invitation.room_code);
    }
  };

  const handleAccept = () => {
    const confirmed = window.confirm(
      "Accept this invitation and enter the deal room?",
    );

    if (confirmed) {
      onAccept(invitation.room_code);
    }
  };

  const description =
    invitation.item_description?.trim() ||
    "No additional description was provided.";

  return (
    <article className="invitation-card">
      <div className="invitation-body">
        <div className="invitation-header">
          <div>
            <span className="invitation-eyebrow">
              Deal invitation
            </span>

            <h5 className="invitation-title">
              {invitation.item_name}
            </h5>
          </div>

          <span className="invitation-status-badge">
            {invitation.status}
          </span>
        </div>

        <div className="invitation-details">
          <div className="invitation-detail">
            <span>From</span>
            <strong>
              {invitation.creator_name}
              {" "}
              <small>
                (User #{invitation.created_by})
              </small>
            </strong>
          </div>

          <div className="invitation-detail">
            <span>Email</span>
            <strong>{invitation.creator_email}</strong>
          </div>

          <div className="invitation-detail">
            <span>Room code</span>
            <strong>{invitation.room_code}</strong>
          </div>

          <div className="invitation-detail">
            <span>Product type</span>
            <strong>
              {invitation.product_type}
            </strong>
          </div>
        </div>

        <div className="invitation-description">
          <span>Deal details</span>
          <p>{description}</p>
        </div>

        <div className="invitation-amount">
          <span>Proposed amount</span>
          <strong>
            $
            {Number(
              invitation.agreed_price || 0,
            ).toFixed(2)}
          </strong>
        </div>

        <div className="action-row">
          <button
            type="button"
            className="accept-btn"
            onClick={handleAccept}
          >
            Accept & Enter
          </button>

          <button
            type="button"
            className="reject-btn"
            onClick={handleReject}
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
};

export default InvitationCard;