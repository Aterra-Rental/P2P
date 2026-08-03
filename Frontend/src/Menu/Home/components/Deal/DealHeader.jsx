import "./DealHeader.css";

const DealHeader = ({
  room,
  currentUserId,
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
const dealHasEnded =
  ["Completed", "Cancelled"].includes(room.status) ||
  ["Completed", "Cancelled"].includes(
    room.current_step,
  );




const canRemindPartner =
  !bothUsersPresent && !dealHasEnded;

  const describeParticipant = (userId) => {
    const relationship =
      Number(userId) === Number(currentUserId) ? "You" : "Partner";

    return `User #${userId} (${relationship})`;
  };

  const rolesAssigned = Boolean(room.buyer_id && room.seller_id);

  const participantCards = rolesAssigned
    ? [
        {
          label: "Buyer",
          value: describeParticipant(room.buyer_id),
        },
        {
          label: "Seller",
          value: describeParticipant(room.seller_id),
        },
      ]
    : [
        {
          label: "Creator",
          value: describeParticipant(room.created_by),
        },
        {
          label: "Invited User",
          value: describeParticipant(room.invited_user_id),
        },
      ];

  const formattedCreatedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(room.created_at));

  return (
    <div className="deal-header">
      <div className="deal-header-top">
        <div className="deal-header-title">
          <span>Deal workspace</span>
          <h1>{room.item_name}</h1>
          <p>Review the deal, complete the current step, and stay in sync.</p>
        </div>

        <div className="deal-header-actions">
          <button type="button" className="leave-room-btn" onClick={onLeave}>
            ← Back to Deals
          </button>

          {canRemindPartner && (
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

              {remindError && <p className="remind-error">{remindError}</p>}
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
          <span>Deal Amount</span>
          <h5>
            $
            {Number(room.agreed_price).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h5>
        </div>
        <div className="deal-info-card">
          <span>Product Type</span>
          <h5>{room.product_type === "Digital" ? "Digital" : "Physical"}</h5>
        </div>

        <div className="deal-info-card">
          <span>Created</span>
          <h5>{formattedCreatedDate}</h5>
        </div>
      </div>

      <div className="deal-participants-heading">
        <span>Participants</span>
        <p> {rolesAssigned ? "Your assigned deal roles" : "Room members before role selection"}</p>
      </div>

      <div className="deal-participants-grid">
        {participantCards.map((participant) => (
          <div
            className="deal-info-card deal-participant-card"
            key={participant.label}
          >
            <span>{participant.label}</span>
            <h5>{participant.value}</h5>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealHeader;
