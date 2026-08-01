import "./DealHeader.css";

const DealHeader = ({
  room,
  bothUsersPresent,
  onLeave,
  onRemind,
  remindLoading,
  remindSuccess,
  remindError,
  remindCooldown,
}) => {
  const cooldownMinutes = Math.floor(remindCooldown / 60);
  const cooldownSeconds = remindCooldown % 60;
  const reminderDisabled = remindLoading || remindCooldown > 0;

  const participantCards = [
    { label: "Creator", value: `User #${room.created_by}` },
    { label: "Invited User", value: `User #${room.invited_user_id}` },
    {
      label: "Buyer",
      value: room.buyer_id ? `User #${room.buyer_id}` : "Waiting...",
    },
    {
      label: "Seller",
      value: room.seller_id ? `User #${room.seller_id}` : "Waiting...",
    },
  ];

  return (
    <div className="deal-header">
      <div className="deal-header-top">
        <div className="deal-header-title">
          <span>Deal workspace</span>
          <h1>{room.item_name}</h1>
          <p>Review the deal, complete the current step, and stay in sync.</p>
        </div>

        <div className="deal-header-actions">
          <button
            type="button"
            className="leave-room-btn"
            onClick={onLeave}
          >
            ← Back to Deals
          </button>

          {!bothUsersPresent && (
            <>
              <button
                type="button"
                className="remind-btn"
                onClick={onRemind}
                disabled={reminderDisabled}
              >
                {remindLoading
                  ? "Sending..."
                  : remindCooldown > 0
                    ? `Wait ${cooldownMinutes}:${String(
                        cooldownSeconds,
                      ).padStart(2, "0")}`
                    : "🔔 Remind Partner"}
              </button>

              {remindSuccess && (
                <p className="remind-success">{remindSuccess}</p>
              )}

              {remindError && (
                <p className="remind-error">{remindError}</p>
              )}
            </>
          )}
        </div>
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
          <h5>{new Date(room.created_at).toLocaleDateString()}</h5>
        </div>
      </div>

      <div className="deal-participants-heading">
        <span>Participants</span>
        <p>Assigned roles and room members</p>
      </div>

      <div className="deal-participants-grid">
        {participantCards.map((participant) => (
          <div className="deal-info-card deal-participant-card" key={participant.label}>
            <span>{participant.label}</span>
            <h5>{participant.value}</h5>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealHeader;
