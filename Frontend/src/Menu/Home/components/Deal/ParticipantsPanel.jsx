import "./ParticipantsPanel.css";

const ParticipantsPanel = ({ room }) => {
  return (
    <div className="participants-panel">
      <h2>Participants</h2>

      <div className="participant-card">
        <span className="participant-label">Creator</span>
        <span>User #{room.created_by}</span>
      </div>

      <div className="participant-card">
        <span className="participant-label">Invited User</span>
        <span>User #{room.invited_user_id}</span>
      </div>

      <div className="participant-card">
        <span className="participant-label">Buyer</span>
        <span>
          {room.buyer_id ? `User #${room.buyer_id}` : "Waiting..."}
        </span>
      </div>

      <div className="participant-card">
        <span className="participant-label">Seller</span>
        <span>
          {room.seller_id ? `User #${room.seller_id}` : "Waiting..."}
        </span>
      </div>

      <div className="participant-card status-card">
        <span className="participant-label">Room Status</span>
        <span>{room.status}</span>
      </div>
    </div>
  );
};

export default ParticipantsPanel;