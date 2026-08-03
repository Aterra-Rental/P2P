import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  confirmDealCancellation,
  getCancellationStatus,
  rejectDealCancellation,
  requestDealCancellation,
} from "../../lib/cancellation";
import { socket } from "../../../../lib/socket";
import "./CancellationPanel.css";


const CancellationPanel = ({ room, userId }) => {
  const [cancellationState, setCancellationState] =
    useState(null);
  const [reason, setReason] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const [ showCancellationDetails, setShowCancellationDetails, ] = useState(false);

  const loadCancellation = useCallback(async () => {
    try {
      const result = await getCancellationStatus(
        room.room_code
      );

      setCancellationState(result);
      setError("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to load cancellation information."
      );
    }
  }, [room.room_code]);

  useEffect(() => {
    let cancelled = false;

    getCancellationStatus(room.room_code)
      .then((result) => {
        if (!cancelled) {
          setCancellationState(result);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load cancellation information."
          );
        }
      });

    const handleCancellationChanged = (payload) => {
      if (payload.room_code === room.room_code) {
        loadCancellation();
      }
    };

    socket.on(
      "cancellation_requested",
      handleCancellationChanged
    );
    socket.on(
      "cancellation_updated",
      handleCancellationChanged
    );
    socket.on(
      "cancellation_rejected",
      handleCancellationChanged
    );
    socket.on(
      "deal_cancelled",
      handleCancellationChanged
    );
    socket.on(
    "fulfillment_submitted",
    handleCancellationChanged
    );

    return () => {
      cancelled = true;

      socket.off(
        "cancellation_requested",
        handleCancellationChanged
      );
      socket.off(
        "cancellation_updated",
        handleCancellationChanged
      );
      socket.off(
        "cancellation_rejected",
        handleCancellationChanged
      );
      socket.off(
        "deal_cancelled",
        handleCancellationChanged
      );
      socket.off(
        "fulfillment_submitted",
        handleCancellationChanged
        );
    };
  }, [loadCancellation, room.room_code]);

  const runAction = async (name, action) => {
    if (loadingAction) return;

    try {
      setLoadingAction(name);
      setError("");

      await action();
      await loadCancellation();
    } catch (err) {
      setError(
        err.message || "Unable to update cancellation."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleRequest = () => {
    const cleanReason = reason.trim();

    if (cleanReason.length < 5) {
      setError(
        "Cancellation reason must contain at least 5 characters."
      );
      return;
    }

    runAction("request", async () => {
      await requestDealCancellation(
        room.room_code,
        cleanReason
      );

      setReason("");
    });
  };

  const handleConfirm = () => {
    runAction("confirm", () =>
      confirmDealCancellation(room.room_code)
    );
  };

  const handleReject = () => {
    runAction("reject", () =>
      rejectDealCancellation(room.room_code)
    );
  };
  const handleOpenCancellation = () => {
    setError("");
    setShowCancellationDetails(true);
  };

  const handleReturnToDeal = () => {
    setReason("");
    setError("");
    setShowCancellationDetails(false);
  };
  if (!cancellationState) {
    return (
      <div className="cancellation-panel">
        <p>Loading cancellation information...</p>
        {error && (
          <div className="cancellation-error">
            {error}
          </div>
        )}
      </div>
    );
  }

  const cancellation =
    cancellationState.cancellation;

  const isPending =
    cancellation?.status === "Pending";

  const isRejected =
    cancellation?.status === "Rejected";

  const isProcessed =
    cancellation?.status === "Processed";

  const cancellationAllowed =
    cancellationState.cancellation_allowed;

  const isUnfunded =
    cancellationState.cancellation_mode === "unfunded";

  const isRequester =
    Number(cancellation?.requested_by) ===
    Number(userId);
  const requesterRole =
    Number(cancellation?.requested_by) ===
    Number(cancellationState.buyer_id)
      ? "Buyer"
      : "Seller";

    const canOpenCancellation =
    cancellationAllowed &&
    (!cancellation || isRejected);

  if (
    canOpenCancellation &&
    !showCancellationDetails
  ) {
    return (
      <div className="cancellation-entry">
        <button
          type="button"
          className="cancellation-open-button"
          onClick={handleOpenCancellation}
        >
          Cancel Deal
        </button>
      </div>
    );
  }
  return (
    <div className="cancellation-panel">
      <div className="cancellation-heading">
        <span>Mutual cancellation</span>
        <h3>
          {isUnfunded
            ? "Cancel Before Payment"
            : "Cancel Funded Deal"}
        </h3>
        <p>
          {isUnfunded
            ? (
                "Both users must approve. The confirmed " +
                "platform fee will be charged from the " +
                "buyer's wallet, and no escrow refund " +
                "will be created."
              )
            : (
                "Both users must approve. The buyer " +
                "receives the refundable escrow amount, " +
                "while the service fee remains " +
                "non-refundable."
              )}
        </p>
      </div>

      <div className="cancellation-refund-summary">
        <div>
          <span>
            {isUnfunded
              ? "Escrow refund"
              : "Buyer refund"}
          </span>

          <strong>
            $
            {Number(
              cancellationState.refund_preview
            ).toFixed(2)}
          </strong>
        </div>

        <div>
          <span>
            {isUnfunded
              ? "Buyer wallet fee"
              : "Service fee retained"}
          </span>

          <strong>
            $
            {Number(
              cancellationState.non_refundable_fee
            ).toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Seller receives</span>
          <strong>$0.00</strong>
        </div>
      </div>

      {isPending && (
        <div className="cancellation-status-card">
          <strong>
            {requesterRole} requested cancellation
          </strong>

          <p>{cancellation.message}</p>
          <p className="cancellation-reason">
            Reason: {cancellation.reason}
          </p>

          {isRequester ? (
            <div className="cancellation-waiting">
              Waiting for your partner to respond...
            </div>
          ) : (
            <div className="cancellation-actions">
              <button
                type="button"
                className="cancellation-confirm-button"
                disabled={Boolean(loadingAction)}
                onClick={handleConfirm}
              >
                {loadingAction === "confirm"
                  ? "Confirming..."
                  : "Accept Cancellation"}
              </button>

              <button
                type="button"
                className="cancellation-reject-button"
                disabled={Boolean(loadingAction)}
                onClick={handleReject}
              >
                {loadingAction === "reject"
                  ? "Rejecting..."
                  : "Keep Deal Active"}
              </button>
            </div>
          )}
        </div>
      )}

      {isProcessed && (
        <div className="cancellation-success">
          <strong>Deal cancelled</strong>
          <p>{cancellation.message}</p>
        </div>
      )}

      {cancellationAllowed &&
        (!cancellation || isRejected) && (
          <div className="cancellation-request-form">
            {isRejected && (
              <div className="cancellation-rejected">
                {isUnfunded
                  ? (
                      "The previous cancellation request " +
                      "was rejected. The deal remains " +
                      "active, and no fee was charged."
                    )
                  : (
                      "The previous cancellation request " +
                      "was rejected. Escrow remains " +
                      "protected."
                    )}
              </div>
        )}

          <label htmlFor="cancellation-reason">
            Reason for cancellation
          </label>

          <textarea
            id="cancellation-reason"
            value={reason}
            maxLength={500}
            placeholder="Explain why you want to cancel..."
            disabled={Boolean(loadingAction)}
            onChange={(event) =>
              setReason(event.target.value)
            }
          />

          <div className="cancellation-form-footer">
            <small>
              {reason.trim().length}/500 characters
            </small>

            <div className="cancellation-form-actions">
              <button
                type="button"
                className="cancellation-return-button"
                disabled={Boolean(loadingAction)}
                onClick={handleReturnToDeal}
              >
                Return to Deal
              </button>

              <button
                type="button"
                className="cancellation-request-button"
                disabled={
                  Boolean(loadingAction) ||
                  reason.trim().length < 5
                }
                onClick={handleRequest}
              >
                {loadingAction === "request"
                  ? "Sending Request..."
                  : "Request Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
      {!cancellationAllowed && !isProcessed && (
        <div className="cancellation-rejected">
          {isUnfunded
            ? (
                "Cancellation is not available during " +
                "the current payment state."
              )
            : (
                "Cancellation is no longer available " +
                "because fulfillment evidence has been " +
                "submitted. Continue through receipt " +
                "confirmation or dispute resolution."
              )}
        </div>
      )}

        {error && (
        <div className="cancellation-error">
          {error}
        </div>
      )}
    </div>
  );
};


export default CancellationPanel;