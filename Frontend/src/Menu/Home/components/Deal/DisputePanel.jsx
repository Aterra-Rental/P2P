import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  FaBalanceScale,
  FaLock,
  FaShieldAlt,
} from "react-icons/fa";

import {
  getDisputeStatus,
  openDealDispute,
} from "../../lib/dispute";
import { socket } from "../../../../lib/socket";
import './DisputePanel.css'


const formatMoney = (value) => {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }
  );
};



const DisputePanel = ({ room }) => {
  const [disputeState, setDisputeState] =
    useState(null);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [
    requestedResolution,
    setRequestedResolution,
  ] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDispute = useCallback(async () => {
    try {
      setLoading(true);

      const result = await getDisputeStatus(
        room.room_code
      );

      setDisputeState(result);
      setError("");
    } catch (loadError) {
      setError(
        loadError.message
        || "Unable to load dispute information."
      );
    } finally {
      setLoading(false);
    }
  }, [room.room_code]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      loadDispute();
    }, 0);

    const handleDisputeChanged = (payload) => {
      if (payload.room_code === room.room_code) {
        loadDispute();
      }
    };

    socket.on(
      "dispute_opened",
      handleDisputeChanged
    );

    socket.on(
      "dispute_resolved",
      handleDisputeChanged
    );

    socket.on(
      "deal_data_changed",
      handleDisputeChanged
    );

    return () => {
      window.clearTimeout(initialLoadTimer);

      socket.off(
        "dispute_opened",
        handleDisputeChanged
      );

      socket.off(
        "dispute_resolved",
        handleDisputeChanged
      );

      socket.off(
        "deal_data_changed",
        handleDisputeChanged
      );
    };
  }, [loadDispute, room.room_code]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanReason = reason.trim();

    if (!requestedResolution) {
      setError(
        "Choose the outcome you want the administrator to review."
      );
      return;
    }

    if (cleanReason.length < 10) {
      setError(
        "Explain the problem using at least 10 characters."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const result = await openDealDispute(
        room.room_code,
        {
          reason: cleanReason,
          requestedResolution,
        }
      );

      setSuccess(result.message);
      setShowForm(false);
      setReason("");

      await loadDispute();
    } catch (submitError) {
      setError(
        submitError.message
        || "Unable to open this dispute."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !disputeState) {
    return (
      <section className="dispute-panel">
        <p>Loading dispute information...</p>
      </section>
    );
  }

  const dispute = disputeState?.dispute;
  const canOpenDispute =
    disputeState?.can_open_dispute === true;

  const myRole = disputeState?.my_role;

  const roleRequestedResolution = (
    myRole === "buyer"
      ? "RefundBuyer"
      : "ReleaseToSeller"
  );

  const isActive = (
    dispute
    && ["Open", "UnderReview"].includes(
      dispute.status
    )
  );

  const hasResolution = Boolean(
    dispute?.resolution
  );

  if (!dispute && !canOpenDispute) {
    return null;
  }

  if (!dispute && canOpenDispute && !showForm) {
    return (
      <section className="dispute-entry">
        <div>
          <span>Need help?</span>
          <h3>Ask an administrator to review the deal</h3>
          <p>
            Escrow remains protected while the
            administrator reviews the deal records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRequestedResolution(
              roleRequestedResolution
            );
            setShowForm(true);
            setError("");
            setSuccess("");
          }}
        >
          Ask Admin for Help
        </button>
      </section>
    );
  }

  return (
    <section className="dispute-panel">
      <header className="dispute-panel-heading">
        <span>Escrow assistance</span>

        <h2>
          <FaBalanceScale />
          {isActive
            ? "Administrator Review"
            : "Dispute Resolution"}
        </h2>

        <p>
          {isActive
            ? (
              "The protected funds are locked while an "
              + "administrator reviews the deal."
            )
            : (
              "Review the administrator’s final decision "
              + "for this dispute."
            )}
        </p>
      </header>

      {error && (
        <div className="dispute-error">
          {error}
        </div>
      )}

      {success && (
        <div className="dispute-success">
          {success}
        </div>
      )}

      {!dispute && showForm && (
        <form
          className="dispute-form"
          onSubmit={handleSubmit}
        >
          <div className="dispute-warning">
            <FaShieldAlt />

            <div>
              <strong>
                Open a dispute only when you need
                administrator assistance
              </strong>

              <p>
                The partner cannot release, refund, or
                cancel the protected escrow while the
                dispute is active.
              </p>
            </div>
          </div>

          <fieldset className="dispute-options">
            <legend>Requested outcome</legend>

            {myRole === "buyer" ? (
              <button
                type="button"
                className="is-selected"
                onClick={() =>
                  setRequestedResolution(
                    "RefundBuyer"
                  )
                }
              >
                <strong>Refund Money</strong>
                <span>
                  Ask the administrator to refund the
                  refundable amount to your wallet.
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="is-selected"
                onClick={() =>
                  setRequestedResolution(
                    "ReleaseToSeller"
                  )
                }
              >
                <strong>Force Release Money</strong>
                <span>
                  Ask the administrator to release the
                  protected seller proceeds to your wallet.
                </span>
              </button>
            )}
          </fieldset>

          <label htmlFor="dispute-reason">
            Explain the problem
          </label>

          <textarea
            id="dispute-reason"
            value={reason}
            maxLength={2000}
            placeholder={
              "Describe what happened, what was agreed, "
              + "and what evidence the administrator "
              + "should review..."
            }
            onChange={(event) =>
              setReason(event.target.value)
            }
          />

          <div className="dispute-form-footer">
            <span>{reason.length}/2000</span>

            <div>
              <button
                type="button"
                className="dispute-return-button"
                disabled={submitting}
                onClick={() => {
                  setShowForm(false);
                  setReason("");
                  setRequestedResolution("");
                  setError("");
                }}
              >
                Return to Deal
              </button>

              <button
                type="submit"
                className="dispute-submit-button"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit for Review"}
              </button>
            </div>
          </div>
        </form>
      )}

      {dispute && (
        <>
          <div className="dispute-status-card">
            <FaLock />

            <div>
              <span>Status</span>
              <strong>{dispute.status}</strong>
              <p>
                Requested outcome:{" "}
                {dispute.requested_resolution}
              </p>
            </div>
          </div>

          <div className="dispute-reason-card">
            <span>Your submitted reason</span>
            <p>{dispute.reason}</p>
          </div>

          {isActive && (
            <div className="dispute-waiting-card">
              <FaLock />

              <div>
                <strong>
                  Escrow funds remain protected
                </strong>

                <p>
                  You may continue discussing the deal
                  in Chat while waiting. The page updates
                  automatically when the administrator
                  issues a decision.
                </p>
              </div>
            </div>
          )}

          {hasResolution && (
            <div className="dispute-resolution-card">
              <span>Administrator decision</span>

              <h3>
                {dispute.resolution.decision}
              </h3>

              <p>
                {dispute.resolution.resolution_note}
              </p>

              <div className="dispute-resolution-money">
                <div>
                  <span>Buyer refund</span>
                  <strong>
                    {formatMoney(
                      dispute.resolution.refund_amount
                    )}
                  </strong>
                </div>

                <div>
                  <span>Seller release</span>
                  <strong>
                    {formatMoney(
                      dispute.resolution
                        .seller_release_amount
                    )}
                  </strong>
                </div>

                <div>
                  <span>Service fee</span>
                  <strong>
                    {formatMoney(
                      dispute.resolution.retained_fee
                    )}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default DisputePanel;