import { useCallback, useEffect, useState } from "react";
import {
  confirmFeeAgreement,
  getFeeAgreement,
  proposeFeePayer,
} from "../../lib/deal";
import { socket } from "../../../../lib/socket";
import "./FeeConfirmation.css";

const FeeConfirmation = ({ room, userId }) => {
  const [feeState, setFeeState] = useState(null);
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");

  const loadFeeAgreement = useCallback(async () => {
    try {
      const result = await getFeeAgreement(
        room.room_code,
        userId
      );

      setFeeState(result);
      setError("");
    } catch (err) {
      setError(
        err.message || "Unable to load the fee agreement."
      );
    }
  }, [room.room_code, userId]);

  useEffect(() => {
    let cancelled = false;

    getFeeAgreement(room.room_code, userId)
      .then((result) => {
        if (!cancelled) {
          setFeeState(result);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load the fee agreement."
          );
        }
      });

    const handleFeeChanged = (payload) => {
      if (payload.room_code === room.room_code) {
        loadFeeAgreement();
      }
    };

    socket.on("fee_payer_proposed", handleFeeChanged);
    socket.on(
      "fee_confirmation_updated",
      handleFeeChanged
    );
    socket.on("fee_confirmed", handleFeeChanged);

    return () => {
      cancelled = true;
      socket.off("fee_payer_proposed", handleFeeChanged);
      socket.off(
        "fee_confirmation_updated",
        handleFeeChanged
      );
      socket.off("fee_confirmed", handleFeeChanged);
    };
  }, [loadFeeAgreement, room.room_code, userId]);

  const runAction = async (name, action) => {
    if (loadingAction) return;

    try {
      setLoadingAction(name);
      setError("");

      await action();
      await loadFeeAgreement();
    } catch (err) {
      setError(
        err.message || "Unable to update the fee agreement."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleProposal = (feePayer) => {
    runAction(feePayer, () =>
      proposeFeePayer(
        room.room_code,
        userId,
        feePayer
      )
    );
  };

  const handleConfirm = () => {
    runAction("confirm", () =>
      confirmFeeAgreement(room.room_code, userId)
    );
  };

  if (!feeState) {
    return (
      <div className="fee-confirmation">
        <p className="fee-loading">
          Loading fee agreement...
        </p>

        {error && <div className="fee-error">{error}</div>}
      </div>
    );
  }

  const hasProposal = Boolean(feeState.fee_payer);
  const myConfirmed = Boolean(
    feeState.my_fee_confirmed
  );

  const partnerConfirmed =
    feeState.my_role === "buyer"
      ? Boolean(feeState.seller_fee_confirmed)
      : Boolean(feeState.buyer_fee_confirmed);

  const proposedByMe =
    Number(feeState.proposed_by_user_id) ===
    Number(userId);

  return (
    <div className="fee-confirmation">
      <div className="fee-heading">
        <span>Service fee agreement</span>
        <h2>Who Will Pay the Fee?</h2>
        <p>
          Discuss this with your partner in chat. Both users
          must confirm the same choice before payment begins.
        </p>
      </div>

      <div className="fee-summary">
        <div>
          <span>Deal amount</span>
          <strong>
            ${Number(feeState.current_amount).toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Service fee</span>
          <strong>
            ${Number(feeState.fee_amount).toFixed(2)}
          </strong>
        </div>
      </div>

      {!hasProposal ? (
        <div className="fee-choice-grid">
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => handleProposal("buyer")}
          >
            <span>Buyer pays the fee</span>
            <strong>
              Buyer deposits $
              {(
                Number(feeState.current_amount) +
                Number(feeState.fee_amount)
              ).toFixed(2)}
            </strong>
          </button>

          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => handleProposal("seller")}
          >
            <span>Seller pays the fee</span>
            <strong>
              Seller receives $
              {(
                Number(feeState.current_amount) -
                Number(feeState.fee_amount)
              ).toFixed(2)}
            </strong>
          </button>
        </div>
      ) : (
        <>
          <div className="fee-proposal-card">
            <span>
              {proposedByMe
                ? "You proposed"
                : "Your partner proposed"}
            </span>

            <h3>
              {feeState.fee_payer === "buyer"
                ? "Buyer pays the service fee"
                : "Seller pays the service fee"}
            </h3>

            <div className="fee-payment-details">
              <div>
                <span>Buyer deposits</span>
                <strong>
                  ${Number(feeState.buyer_deposit).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Seller receives</span>
                <strong>
                  ${Number(feeState.seller_receive).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          <div className="fee-status-list">
            <div>
              <span>You</span>
              <strong className={myConfirmed ? "confirmed" : "waiting"}>
                {myConfirmed ? "Confirmed" : "Not confirmed"}
              </strong>
            </div>

            <div>
              <span>Your partner</span>
              <strong
                className={partnerConfirmed ? "confirmed" : "waiting"}
              >
                {partnerConfirmed
                  ? "Confirmed"
                  : "Not confirmed"}
              </strong>
            </div>
          </div>

          {!myConfirmed && (
            <div className="fee-actions">
              <button
                type="button"
                className="fee-primary-button"
                disabled={Boolean(loadingAction)}
                onClick={handleConfirm}
              >
                {loadingAction === "confirm"
                  ? "Confirming..."
                  : "Confirm Fee Agreement"}
              </button>

              <button
                type="button"
                className="fee-secondary-button"
                disabled={Boolean(loadingAction)}
                onClick={() =>
                  handleProposal(
                    feeState.fee_payer === "buyer"
                      ? "seller"
                      : "buyer"
                  )
                }
              >
                Propose{" "}
                {feeState.fee_payer === "buyer"
                  ? "Seller Pays"
                  : "Buyer Pays"}
              </button>
            </div>
          )}

          {myConfirmed && !partnerConfirmed && (
            <p className="fee-waiting-message">
              Fee choice confirmed. Waiting for your partner...
            </p>
          )}
        </>
      )}

      {error && <div className="fee-error">{error}</div>}
    </div>
  );
};

export default FeeConfirmation;