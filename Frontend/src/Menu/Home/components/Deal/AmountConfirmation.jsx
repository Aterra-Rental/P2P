import { useCallback, useEffect, useState } from "react";
import {
  confirmDealAmount,
  getDealAmount,
  proposeDealAmount,
} from "../../lib/deal";
import { socket } from "../../../../lib/socket";
import "./AmountConfirmation.css";

const AmountConfirmation = ({ room, userId }) => {
  const [amountState, setAmountState] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");

  const loadAmount = useCallback(async () => {
    try {
      setError("");

      const result = await getDealAmount(
        room.room_code,
        userId
      );

      setAmountState(result);
    } catch (err) {
      setError(
        err.message || "Unable to load the deal amount."
      );
    }
  }, [room.room_code, userId]);

    useEffect(() => {
    let cancelled = false;

    getDealAmount(room.room_code, userId)
      .then((result) => {
        if (!cancelled) {
          setAmountState(result);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load the deal amount."
          );
        }
      });

    const handleAmountChanged = (payload) => {
      if (payload.room_code === room.room_code) {
        loadAmount();
      }
    };

    socket.on("amount_proposed", handleAmountChanged);
    socket.on(
      "amount_confirmation_updated",
      handleAmountChanged
    );
    socket.on("amount_confirmed", handleAmountChanged);

    return () => {
      cancelled = true;

      socket.off("amount_proposed", handleAmountChanged);
      socket.off(
        "amount_confirmation_updated",
        handleAmountChanged
      );
      socket.off("amount_confirmed", handleAmountChanged);
    };
  }, [loadAmount, room.room_code, userId]);

  const runAction = async (name, action) => {
    if (loadingAction) return;

    try {
      setLoadingAction(name);
      setError("");

      await action();
      await loadAmount();
    } catch (err) {
      setError(
        err.message || "Unable to update the amount."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleConfirm = () => {
    runAction("confirm", () =>
      confirmDealAmount(room.room_code, userId)
    );
  };

  const handleProposal = () => {
    const amount = Number(newAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    runAction("propose", async () => {
      await proposeDealAmount(
        room.room_code,
        userId,
        amount
      );

      setAdjusting(false);
      setNewAmount("");
    });
  };

  if (!amountState) {
    return (
      <div className="amount-confirmation">
        <p className="amount-loading">
          Loading amount negotiation...
        </p>

        {error && (
          <div className="amount-error">{error}</div>
        )}
      </div>
    );
  }

  const myConfirmed = Boolean(
    amountState.my_amount_confirmed
  );

  const partnerConfirmed =
    amountState.my_role === "buyer"
      ? Boolean(amountState.seller_amount_confirmed)
      : Boolean(amountState.buyer_amount_confirmed);

  const proposedByMe =
    Number(amountState.proposed_by_user_id) ===
    Number(userId);

  return (
    <div className="amount-confirmation">
      <div className="amount-heading">
        <span>Deal confirmation</span>
        <h2>Confirm Deal Amount</h2>
        <p>
          Both participants must confirm the same current
          amount before choosing who pays the service fee.
        </p>
      </div>

      <div className="current-amount-card">
        <span>
          {proposedByMe
            ? "You proposed"
            : "Your partner proposed"}
        </span>

        <strong>
          ${Number(amountState.current_amount).toFixed(2)}
        </strong>
      </div>

      <div className="amount-status-list">
        <div>
          <span>You</span>
          <strong
            className={
              myConfirmed
                ? "amount-confirmed"
                : "amount-waiting"
            }
          >
            {myConfirmed ? "Confirmed" : "Not confirmed"}
          </strong>
        </div>

        <div>
          <span>Your partner</span>
          <strong
            className={
              partnerConfirmed
                ? "amount-confirmed"
                : "amount-waiting"
            }
          >
            {partnerConfirmed
              ? "Confirmed"
              : "Not confirmed"}
          </strong>
        </div>
      </div>

      {adjusting ? (
        <div className="amount-adjustment">
          <label htmlFor="new-deal-amount">
            Propose a new amount
          </label>

          <div className="amount-input-wrap">
            <span>$</span>

            <input
              id="new-deal-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={newAmount}
              disabled={Boolean(loadingAction)}
              onChange={(event) =>
                setNewAmount(event.target.value)
              }
              placeholder="120.00"
            />
          </div>

          <div className="amount-actions">
            <button
              type="button"
              className="amount-primary-button"
              disabled={Boolean(loadingAction)}
              onClick={handleProposal}
            >
              {loadingAction === "propose"
                ? "Sending..."
                : "Send Proposal"}
            </button>

            <button
              type="button"
              className="amount-secondary-button"
              disabled={Boolean(loadingAction)}
              onClick={() => {
                setAdjusting(false);
                setNewAmount("");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="amount-actions">
          <button
            type="button"
            className="amount-primary-button"
            disabled={
              Boolean(loadingAction) || myConfirmed
            }
            onClick={handleConfirm}
          >
            {myConfirmed
              ? "Amount Confirmed"
              : loadingAction === "confirm"
                ? "Confirming..."
                : "Confirm Amount"}
          </button>

          <button
            type="button"
            className="amount-secondary-button"
            disabled={Boolean(loadingAction) || myConfirmed}
            onClick={() => {
              setAdjusting(true);
              setNewAmount(
                String(amountState.current_amount)
              );
              setError("");
            }}
          >
            Adjust Amount
          </button>
        </div>
      )}

      {myConfirmed && !partnerConfirmed && (
        <p className="amount-waiting-message">
          Amount confirmed. Waiting for your partner...
        </p>
      )}

      {error && (
        <div className="amount-error">{error}</div>
      )}
    </div>
  );
};

export default AmountConfirmation;