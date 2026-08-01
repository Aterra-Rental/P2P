import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generateQR } from "../../lib/payment";
import "./PaymentPanel.css";


const formatRemainingTime = (milliseconds) => {
  if (milliseconds <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};


const PaymentPanel = ({ room, userId }) => {
  const [paymentQR, setPaymentQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  const isBuyer =
    Number(userId) === Number(room.buyer_id);

  useEffect(() => {
    if (!paymentQR?.expires_at) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentQR?.expires_at]);

  const expiresAt = paymentQR?.expires_at
    ? new Date(paymentQR.expires_at).getTime()
    : null;

  const remainingTime = expiresAt
    ? expiresAt - currentTime
    : 0;

  const expired = Boolean(
    paymentQR && remainingTime <= 0
  );

  const handleGenerateQR = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError("");

      const result = await generateQR(room.room_code);

      setPaymentQR(result);
      setCurrentTime(Date.now());
    } catch (err) {
      setError(
        err.message || "Unable to generate the payment QR."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isBuyer) {
    return (
      <div className="payment-panel">
        <div className="payment-heading">
          <span>Payment stage</span>
          <h2>Waiting for Buyer Payment</h2>
          <p>
            The buyer must generate the KHQR and complete
            the required deposit. Keep this workspace open
            for real-time updates.
          </p>
        </div>

        <div className="payment-waiting-card">
          <strong>Payment has not been verified yet</strong>
          <p>
            You do not need to generate or scan the buyer’s
            payment QR.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-panel">
      <div className="payment-heading">
        <span>Payment stage</span>
        <h2>Buyer Payment</h2>
        <p>
          Generate a KHQR for the exact confirmed deposit.
          Do not edit or manually replace the payment amount.
        </p>
      </div>

      {!paymentQR ? (
        <div className="payment-generate-card">
          <h3>Payment QR is ready to generate</h3>
          <p>
            The backend will use the confirmed buyer deposit
            stored in PostgreSQL.
          </p>

          <button
            type="button"
            className="payment-primary-button"
            disabled={loading}
            onClick={handleGenerateQR}
          >
            {loading
              ? "Generating..."
              : "Generate Payment QR"}
          </button>
        </div>
      ) : (
        <div className="payment-qr-section">
          <div
            className={`payment-qr-box ${
              expired ? "payment-qr-expired" : ""
            }`}
          >
            <QRCodeSVG
              value={paymentQR.qr}
              size={240}
              level="M"
              bgColor="#ffffff"
              fgColor="#111111"
            />
          </div>

          <div className="payment-amount">
            <span>Deposit amount</span>
            <strong>
              {paymentQR.currency}{" "}
              {Number(paymentQR.amount).toFixed(2)}
            </strong>
          </div>

          <div className="payment-expiration">
            <span>QR status</span>
            <strong className={expired ? "expired" : ""}>
              {expired
                ? "Expired"
                : `Expires in ${formatRemainingTime(
                    remainingTime
                  )}`}
            </strong>
          </div>

          {paymentQR.reused && !expired && (
            <p className="payment-reused-message">
              Your existing unexpired QR was restored.
            </p>
          )}

          {expired && (
            <button
              type="button"
              className="payment-primary-button"
              disabled={loading}
              onClick={handleGenerateQR}
            >
              {loading
                ? "Generating..."
                : "Generate New QR"}
            </button>
          )}

          {!expired && (
            <p className="payment-instruction">
              Scan this QR using a participating Bakong or
              Cambodian banking application.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="payment-error">{error}</div>
      )}
    </div>
  );
};


export default PaymentPanel;