import "./RoomCard.css";
import { useState } from "react";
import { reinviteRoom, deleteRoom } from "../../lib/room";

const RoomCard = ({ room, currentUserId, onOpen, onUpdated }) => {
  const isCreator = String(room.created_by) === String(currentUserId);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const hasPartnerUpdate =
    room.last_action_by &&
    String(room.last_action_by) !== String(currentUserId);

  const handleReinvite = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to send this invitation again?",
    );

    if (!confirmed || actionLoading) {
      return;
    }

    try {
      setActionError("");
      setActionSuccess("");
      setActionLoading(true);

      const result = await reinviteRoom(room.room_code, currentUserId);

      if (!result.success) {
        throw new Error(result.message || "Failed to re-invite user.");
      }
      await onUpdated?.();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };
  const handleDelete = async () => {
    const isWaitingRoom = room.status === "Waiting";

    const confirmed = window.confirm(
      isWaitingRoom
        ? "Cancel this invitation? The invited user " +
            "will no longer see this room."
        : "Delete this rejected room?",
    );

    if (!confirmed || actionLoading) {
      return;
    }

    try {
      setActionError("");
      setActionSuccess("");
      setActionLoading(true);

      const result = await deleteRoom(room.room_code);

      if (!result.success) {
        throw new Error(result.message || "Failed to delete room.");
      }

      await onUpdated?.();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };
  console.log("ROOM:", room);
  console.log("currentUserId:", currentUserId);
  console.log(
    room.status,
    room.created_by,
    room.reinvite_count,
    room.max_reinvites,
  );

  const canReturnToRoom = ["Accepted", "RolesAssigned"].includes(room.status);
  return (
    <div className="room-card">
      <div className="room-body">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="room-title-row">
              <h5 className="room-title">{room.item_name}</h5>
              {hasPartnerUpdate && (
                <span
                  className="room-update-dot"
                  title="Your partner has updated this deal"
                />
              )}
            </div>
            {(room.has_unread_reminder || room.reminded) && (
                <div
                  className="room-reminder"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="room-reminder-icon"
                    aria-hidden="true"
                  >
                    🔔
                  </span>

                  <div className="room-reminder-copy">
                    <strong>Partner sent a reminder</strong>
                    <span>
                      Open this room when you are ready to continue.
                    </span>
                  </div>
                </div>
              )}

            <p className="room-info">
              <strong>Room Code:</strong> {room.room_code}
            </p>

            <p className="room-info">
              <strong>{isCreator ? "Partner:" : "From:"}</strong>{" "}
              {isCreator
                ? `${room.invited_name} [ID: ${room.invited_user_id}]`
                : `${room.creator_name} [ID: ${room.created_by}]`}
            </p>

            <p className="room-info">
              <strong>Agreed Amount:</strong> $
              {Number(room.agreed_price || 0).toFixed(2)}
            </p>

            <p className="mb-2">
              <strong>Status:</strong>{" "}
              <span className={`room-status ${room.status.toLowerCase()}`}>
                {room.status}
              </span>
            </p>
          </div>

          <div className="room-actions">
            {actionError && <p className="room-action-error">{actionError}</p>}
            {actionSuccess && (
              <p className="room-action-success">{actionSuccess}</p>
            )}
            {canReturnToRoom && (
              <button
                type="button"
                className="open-room-btn"
                onClick={() => onOpen(room)}
              >
                Return to Room
              </button>
            )}

            {room.status === "Waiting" && isCreator && (
              <>
                <button
                  type="button"
                  className="open-room-btn"
                  disabled
                >
                  Waiting for response
                </button>

                <button
                  type="button"
                  className="delete-room-btn"
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Cancelling..."
                    : "Cancel Invitation"}
                </button>
              </>
            )}

            {room.status === "Rejected" &&
              isCreator && (
                <>
                  {room.reinvite_count < room.max_reinvites ? (
                    <button
                      className="reinvite-room-btn"
                      onClick={handleReinvite}
                      disabled={actionLoading}
                    >
                      {actionLoading
                        ? "Processing..."
                        : `Re-invite (${room.max_reinvites - room.reinvite_count} left)`}
                    </button>
                  ) : (
                    <p className="reinvite-limit-message">
                      Re-invite limit reached
                    </p>
                  )}

                  <button
                    className="delete-room-btn"
                    onClick={handleDelete}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Delete"}
                  </button>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
