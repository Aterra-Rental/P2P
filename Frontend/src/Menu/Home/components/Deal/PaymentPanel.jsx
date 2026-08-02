import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  generateQR,
  getWallet,
  payWithWallet,
} from "../../lib/payment";
import { getFeeAgreement } from "../../lib/deal";
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
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentQR, setPaymentQR] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [feeState, setFeeState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
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

  const requiredDeposit = feeState?.buyer_deposit;
  const availableBalance = wallet?.available_balance;

  const canAfford =
    requiredDeposit !== undefined &&
    availableBalance !== undefined &&
    Number(availableBalance) >= Number(requiredDeposit);

  const handleSelectWallet = async () => {
    if (loading || walletLoading) return;

    try {
      setPaymentMethod("wallet");
      setWalletLoading(true);
      setError("");

      const [walletResponse, feeResponse] =
        await Promise.all([
          getWallet(),
          getFeeAgreement(room.room_code, userId),
        ]);

      setWallet(walletResponse.wallet);
      setFeeState(feeResponse);
    } catch (err) {
      setError(
        err.message || "Unable to load wallet information."
      );
    } finally {
      setWalletLoading(false);
    }
  };

  const handleSelectKhqr = () => {
    if (loading || walletLoading) return;

    setPaymentMethod("khqr");
    setError("");
  };

  const handleWalletPayment = async () => {
    if (loading || !canAfford) return;

    try {
      setLoading(true);
      setError("");

      const result = await payWithWallet(
        room.room_code
      );

      setWallet((currentWallet) => ({
        ...currentWallet,
        available_balance: result.available_balance,
        held_balance: result.held_balance,
      }));
    } catch (err) {
      setError(
        err.message || "Unable to pay using the wallet."
      );
    } finally {
      setLoading(false);
    }
  };

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
            The buyer must choose Wallet or KHQR and
            complete the required deposit.
          </p>
        </div>

        <div className="payment-waiting-card">
          <strong>Payment has not been verified yet</strong>
          <p>
            This page will update automatically when the
            buyer’s payment is held in escrow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-panel">
      <div className="payment-heading">
        <span>Payment stage</span>
        <h2>Choose Payment Method</h2>
        <p>
          Pay from your available wallet balance or scan
          KHQR using a supported banking application.
        </p>
      </div>

      <div className="payment-method-list">
        <button
          type="button"
          className={`payment-method-card ${
            paymentMethod === "wallet"
              ? "payment-method-selected"
              : ""
          }`}
          disabled={loading || walletLoading}
          onClick={handleSelectWallet}
        >
          <span className="payment-method-icon">W</span>

          <span className="payment-method-copy">
            <strong>Wallet</strong>
            <small>
              {wallet
                ? `Available $${Number(
                    wallet.available_balance
                  ).toFixed(2)}`
                : "Use your available wallet balance"}
            </small>
          </span>

          <span className="payment-method-radio">
            {paymentMethod === "wallet" ? "✓" : ""}
          </span>
        </button>

        <button
          type="button"
          className={`payment-method-card ${
            paymentMethod === "khqr"
              ? "payment-method-selected"
              : ""
          }`}
          disabled={loading || walletLoading}
          onClick={handleSelectKhqr}
        >
          <span className="payment-method-icon">QR</span>

          <span className="payment-method-copy">
            <strong>KHQR</strong>
            <small>
              Scan using a participating banking app
            </small>
          </span>

          <span className="payment-method-radio">
            {paymentMethod === "khqr" ? "✓" : ""}
          </span>
        </button>
      </div>

      {paymentMethod === "wallet" && (
        <div className="payment-generate-card">
          {walletLoading ? (
            <p>Loading wallet balance...</p>
          ) : (
            <>
              <h3>Pay from Wallet</h3>

              <div className="payment-wallet-summary">
                <div>
                  <span>Available balance</span>
                  <strong>
                    ${Number(
                      wallet?.available_balance || 0
                    ).toFixed(2)}
                  </strong>
                </div>

                <div>
                  <span>Required deposit</span>
                  <strong>
                    ${Number(
                      requiredDeposit || 0
                    ).toFixed(2)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="payment-primary-button"
                disabled={loading || !canAfford}
                onClick={handleWalletPayment}
              >
                {loading
                  ? "Holding Funds..."
                  : "Pay with Wallet"}
              </button>

              {!canAfford && wallet && (
                <p className="payment-balance-warning">
                  Your available wallet balance is
                  insufficient for this deposit.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {paymentMethod === "khqr" && !paymentQR && (
        <div className="payment-generate-card">
          <h3>Generate Payment QR</h3>
          <p>
            The backend uses the confirmed buyer deposit
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
      )}

      {paymentMethod === "khqr" && paymentQR && (
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