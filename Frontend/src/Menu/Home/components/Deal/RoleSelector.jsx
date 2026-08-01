import { useState } from "react";
import {
  selectDealRole,
  confirmDealRole,
  resetDealRoles,
} from "../../lib/deal";
import "./RoleSelector.css";

const RoleSelector = ({ room, roleState, onLeave }) => {
  const [loadingAction, setLoadingAction] =
    useState("");
  const [error, setError] = useState("");

  const userId = Number(
    localStorage.getItem("user_id")
  );

  const rolesSelected =
    Boolean(roleState?.buyer_id) &&
    Boolean(roleState?.seller_id);

  const myRole = roleState?.my_role;
  const myReady = Boolean(roleState?.my_ready);

  const partnerReady =
    myRole === "buyer"
      ? Boolean(roleState?.seller_ready)
      : Boolean(roleState?.buyer_ready);

  const runAction = async (
    actionName,
    action
  ) => {
    if (loadingAction) return;

    try {
      setLoadingAction(actionName);
      setError("");

      await action();

      /*
       * The backend emits a Socket.IO event.
       * DealWorkspace receives it and reloads
       * roleState for both users.
       */
    } catch (err) {
      setError(
        err.message ||
        "Unable to update role selection."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleSelectRole = (role) => {
    runAction(`select-${role}`, () =>
      selectDealRole(
        room.room_code,
        userId,
        role
      )
    );
  };

  const handleConfirmRole = () => {
    runAction("confirm", () =>
      confirmDealRole(
        room.room_code,
        userId
      )
    );
  };

  const handleResetRoles = () => {
    runAction("reset", () =>
      resetDealRoles(
        room.room_code,
        userId
      )
    );
  };

  if (!roleState) {
    return (
      <div className="role-modal-overlay">
        <div className="role-modal">
          <button
  type="button"
  className="role-modal-leave-button"
  onClick={onLeave}
>
  ← Leave Room
</button>
          <div className="role-loading-line">
            Loading role selection...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="role-modal-overlay">
      <div
        className="role-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
      >
        <button
  type="button"
  className="role-modal-leave-button"
  onClick={onLeave}
>
  ← Leave Room
</button>
        {!rolesSelected ? (
          <>
            <div className="role-modal-header">
              <span className="role-modal-label">
                Role Selection
              </span>

              <h2 id="role-modal-title">
                Choose Your Role
              </h2>

              <p>
                Both users can choose. The first successful
                selection assigns the roles for both users.
              </p>
            </div>

            <div className="role-options">
              <button
                type="button"
                className="role-option"
                disabled={Boolean(loadingAction)}
                onClick={() =>
                  handleSelectRole("buyer")
                }
              >
                <span className="role-icon">🛒</span>

                <span className="role-name">
                  Buyer
                </span>

                <span className="role-description">
                  Deposits the payment and releases it
                  after completing the deal.
                </span>

                <span className="role-button-label">
                  {loadingAction === "select-buyer"
                    ? "Selecting..."
                    : "Select Buyer"}
                </span>
              </button>

              <button
                type="button"
                className="role-option"
                disabled={Boolean(loadingAction)}
                onClick={() =>
                  handleSelectRole("seller")
                }
              >
                <span className="role-icon">📦</span>

                <span className="role-name">
                  Seller
                </span>

                <span className="role-description">
                  Provides the item and receives payment
                  after release.
                </span>

                <span className="role-button-label">
                  {loadingAction === "select-seller"
                    ? "Selecting..."
                    : "Select Seller"}
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="role-modal-header">
              <span className="role-modal-label">
                Role Confirmation
              </span>

              <h2 id="role-modal-title">
                Confirm Your Role
              </h2>

              <p>
                Review the proposed assignment. Both users
                must confirm before the deal continues.
              </p>
            </div>

            <div className="selected-role-card">
              <span className="selected-role-icon">
                {myRole === "buyer" ? "🛒" : "📦"}
              </span>

              <span className="selected-role-caption">
                Your proposed role
              </span>

              <strong>
                {myRole === "buyer"
                  ? "Buyer"
                  : "Seller"}
              </strong>
            </div>

            <div className="role-confirmation-status">
              <div className="confirmation-status-row">
                <span>You</span>

                <strong
                  className={
                    myReady
                      ? "status-confirmed"
                      : "status-waiting"
                  }
                >
                  {myReady
                    ? "Confirmed"
                    : "Waiting for confirmation"}
                </strong>
              </div>

              <div className="confirmation-status-row">
                <span>Your partner</span>

                <strong
                  className={
                    partnerReady
                      ? "status-confirmed"
                      : "status-waiting"
                  }
                >
                  {partnerReady
                    ? "Confirmed"
                    : "Waiting for confirmation"}
                </strong>
              </div>
            </div>

            <div className="role-confirmation-actions">
              <button
                type="button"
                className="confirm-role-button"
                disabled={
                  Boolean(loadingAction) ||
                  myReady
                }
                onClick={handleConfirmRole}
              >
                {myReady
                  ? "Role Confirmed"
                  : loadingAction === "confirm"
                    ? "Confirming..."
                    : "Confirm Role"}
              </button>

              <button
                type="button"
                className="choose-again-button"
                disabled={Boolean(loadingAction)}
                onClick={handleResetRoles}
              >
                {loadingAction === "reset"
                  ? "Resetting..."
                  : "Disagree — Choose Again"}
              </button>
            </div>

            {myReady && !partnerReady && (
              <p className="waiting-partner-message">
                Your role is confirmed. Waiting for your
                partner.
              </p>
            )}
          </>
        )}

        {error && (
          <div className="role-error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleSelector;