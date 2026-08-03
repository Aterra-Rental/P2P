import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  confirmDealReceived,
  getFulfillmentProof,
  getFulfillmentStatus,
  submitFulfillment,
} from "../../lib/fulfillment";
import { socket } from "../../../../lib/socket";
import "./FulfillmentPanel.css";


const MAX_PROOF_SIZE = 5 * 1024 * 1024;


const FulfillmentPanel = ({ room }) => {
  const [fulfillmentState, setFulfillmentState] =
    useState(null);
  const [description, setDescription] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] =
    useState("");
  const [proof, setProof] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofContentType, setProofContentType] =
    useState("");
  const [receiptConfirmed, setReceiptConfirmed] =
    useState(false);
  const [loadingAction, setLoadingAction] =
    useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFulfillment = useCallback(async () => {
    try {
      const result = await getFulfillmentStatus(
        room.room_code
      );

      setFulfillmentState(result);
      setError("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to load fulfillment information."
      );
    }
  }, [room.room_code]);

  useEffect(() => {
    let cancelled = false;

    getFulfillmentStatus(room.room_code)
      .then((result) => {
        if (!cancelled) {
          setFulfillmentState(result);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load fulfillment information."
          );
        }
      });

    const handleFulfillmentChanged = (payload) => {
      if (payload.room_code === room.room_code) {
        loadFulfillment();
      }
    };

    socket.on(
      "fulfillment_submitted",
      handleFulfillmentChanged
    );

    return () => {
      cancelled = true;

      socket.off(
        "fulfillment_submitted",
        handleFulfillmentChanged
      );
    };
  }, [loadFulfillment, room.room_code]);

  useEffect(() => {
    return () => {
      if (proofUrl) {
        URL.revokeObjectURL(proofUrl);
      }
    };
  }, [proofUrl]);

  const handleProofChange = (event) => {
    const selectedProof =
      event.target.files?.[0] || null;

    setError("");
    setProof(null);

    if (!selectedProof) {
      return;
    }

    if (selectedProof.size > MAX_PROOF_SIZE) {
      setError(
        "Fulfillment proof must not exceed 5 MB."
      );
      event.target.value = "";
      return;
    }

    setProof(selectedProof);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loadingAction) return;

    const isPhysical =
      fulfillmentState.product_type === "Physical";

    if (!proof) {
      setError("Select a fulfillment proof file.");
      return;
    }

    if (isPhysical && !courierName.trim()) {
      setError(
        "Courier name is required for a physical product."
      );
      return;
    }

    if (isPhysical && !trackingNumber.trim()) {
      setError(
        "Tracking number is required for a physical product."
      );
      return;
    }

    if (
      !isPhysical &&
      description.trim().length < 5
    ) {
      setError(
        "Describe how the digital product was delivered."
      );
      return;
    }

    try {
      setLoadingAction("submit");
      setError("");
      setSuccess("");

      const result = await submitFulfillment(
        room.room_code,
        {
          description: description.trim(),
          courierName: courierName.trim(),
          trackingNumber: trackingNumber.trim(),
          proof,
        }
      );

      setSuccess(result.message);
      await loadFulfillment();
    } catch (err) {
      setError(
        err.message ||
          "Unable to submit fulfillment evidence."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleLoadProof = async () => {
    if (loadingAction) return;

    try {
      setLoadingAction("proof");
      setError("");

      const result = await getFulfillmentProof(
        room.room_code
      );

      if (proofUrl) {
        URL.revokeObjectURL(proofUrl);
      }

      setProofUrl(URL.createObjectURL(result.blob));
      setProofContentType(result.contentType);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load fulfillment proof."
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleConfirmReceived = async () => {
    if (loadingAction || !receiptConfirmed) return;

    try {
      setLoadingAction("confirm");
      setError("");
      setSuccess("");

      const result = await confirmDealReceived(
        room.room_code
      );

      setSuccess(result.message);
    } catch (err) {
      setError(
        err.message ||
          "Unable to confirm receipt."
      );
    } finally {
      setLoadingAction("");
    }
  };

  if (!fulfillmentState) {
    return (
      <div className="fulfillment-panel">
        <p>Loading fulfillment information...</p>

        {error && (
          <div className="fulfillment-error">
            {error}
          </div>
        )}
      </div>
    );
  }

  const isSeller =
    fulfillmentState.my_role === "seller";

  const isPhysical =
    fulfillmentState.product_type === "Physical";

  const submitted =
    fulfillmentState.fulfillment_submitted;

  const fulfillment =
    fulfillmentState.fulfillment;

  return (
    <div className="fulfillment-panel">
      <div className="fulfillment-heading">
        <span>Delivery stage</span>
        <h2>
          {submitted
            ? "Fulfillment Submitted"
            : isSeller
              ? "Submit Fulfillment"
              : "Waiting for Seller"}
        </h2>

        <p>
          {isPhysical
            ? "The seller must provide shipping evidence and tracking information."
            : "The seller must provide evidence that the digital product or service was delivered."}
        </p>
      </div>

      {!submitted && isSeller && (
        <form
          className="fulfillment-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="fulfillment-description">
            Delivery description
          </label>

          <textarea
            id="fulfillment-description"
            value={description}
            maxLength={1000}
            placeholder={
              isPhysical
                ? "Optional packaging or shipping details..."
                : "Explain how the digital item was delivered..."
            }
            disabled={Boolean(loadingAction)}
            onChange={(event) =>
              setDescription(event.target.value)
            }
          />

          {isPhysical && (
            <div className="fulfillment-shipping-grid">
              <div>
                <label htmlFor="courier-name">
                  Courier name
                </label>

                <input
                  id="courier-name"
                  type="text"
                  value={courierName}
                  maxLength={100}
                  placeholder="Courier company"
                  disabled={Boolean(loadingAction)}
                  onChange={(event) =>
                    setCourierName(event.target.value)
                  }
                />
              </div>

              <div>
                <label htmlFor="tracking-number">
                  Tracking number
                </label>

                <input
                  id="tracking-number"
                  type="text"
                  value={trackingNumber}
                  maxLength={100}
                  placeholder="Tracking reference"
                  disabled={Boolean(loadingAction)}
                  onChange={(event) =>
                    setTrackingNumber(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          )}

          <label htmlFor="fulfillment-proof">
            Proof file
          </label>

          <input
            id="fulfillment-proof"
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            disabled={Boolean(loadingAction)}
            onChange={handleProofChange}
          />

          <small>
            PNG, JPG, JPEG, or PDF. Maximum 5 MB.
          </small>

          {proof && (
            <div className="fulfillment-file-name">
              Selected: {proof.name}
            </div>
          )}

          <button
            type="submit"
            className="fulfillment-primary-button"
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === "submit"
              ? "Submitting..."
              : "Submit Fulfillment Evidence"}
          </button>
        </form>
      )}

      {!submitted && !isSeller && (
        <div className="fulfillment-waiting-card">
          <strong>
            Seller has not submitted fulfillment yet
          </strong>
          <p>
            This panel will update automatically when
            evidence is available.
          </p>
        </div>
      )}

      {submitted && (
        <div className="fulfillment-evidence-card">
          <div className="fulfillment-details">
            <div>
              <span>Product type</span>
              <strong>
                {fulfillmentState.product_type}
              </strong>
            </div>

            <div>
              <span>Delivery status</span>
              <strong>
                {fulfillmentState.shipping_status}
              </strong>
            </div>

            {isPhysical && (
              <>
                <div>
                  <span>Courier</span>
                  <strong>
                    {fulfillment.courier_name}
                  </strong>
                </div>

                <div>
                  <span>Tracking number</span>
                  <strong>
                    {fulfillment.tracking_number}
                  </strong>
                </div>
              </>
            )}
          </div>

          {fulfillment.description && (
            <div className="fulfillment-description">
              <span>Seller description</span>
              <p>{fulfillment.description}</p>
            </div>
          )}

          <button
            type="button"
            className="fulfillment-secondary-button"
            disabled={Boolean(loadingAction)}
            onClick={handleLoadProof}
          >
            {loadingAction === "proof"
              ? "Loading Proof..."
              : "View Fulfillment Proof"}
          </button>

          {proofUrl &&
            proofContentType.startsWith("image/") && (
              <img
                className="fulfillment-proof-image"
                src={proofUrl}
                alt="Seller fulfillment proof"
              />
            )}

          {proofUrl &&
            proofContentType === "application/pdf" && (
              <a
                className="fulfillment-proof-link"
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open PDF proof
              </a>
            )}

          {isSeller ? (
            <div className="fulfillment-waiting-card">
              Waiting for the buyer to review the evidence
              and confirm receipt.
            </div>
          ) : (
            <div className="fulfillment-confirmation">
              <label>
                <input
                  type="checkbox"
                  checked={receiptConfirmed}
                  disabled={Boolean(loadingAction)}
                  onChange={(event) =>
                    setReceiptConfirmed(
                      event.target.checked
                    )
                  }
                />

                I received the product or service and
                authorize release of the escrow funds.
              </label>

              <button
                type="button"
                className="fulfillment-primary-button"
                disabled={
                  Boolean(loadingAction) ||
                  !receiptConfirmed
                }
                onClick={handleConfirmReceived}
              >
                {loadingAction === "confirm"
                  ? "Releasing Funds..."
                  : "Confirm Receipt and Release Funds"}
              </button>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="fulfillment-success">
          {success}
        </div>
      )}

      {error && (
        <div className="fulfillment-error">
          {error}
        </div>
      )}
    </div>
  );
};


export default FulfillmentPanel;