import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, X, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useAuth } from "../components/AuthContext";
import { showTopNotification as showNotification } from "../lib/notification.js";
import "./WalletWidget.css";

export default function WalletWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const panelRef = useRef(null);
  const buttonRef = useRef(null);


// Close panel on Escape or outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDeposit = () => {
    showNotification("Deposit is not connected yet.", "info");
  };

  const handleWithdraw = () => {
    showNotification("Withdrawal is not connected yet.", "info");
  };

  const handleSignInClick = () => {
    setIsOpen(false);
    navigate("/Login");
  };

  return (
    <div className="wallet-widget">
      <button
        ref={buttonRef}
        type="button"
        className="wallet-floating-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open wallet preview"
        aria-expanded={isOpen}
        aria-controls="wallet-preview-panel"
      >
        {isOpen ? <X size={24} /> : <Wallet size={24} />}
      </button>

      {isOpen && (
        <div
          id="wallet-preview-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Wallet Preview"
          className="wallet-preview-panel"
        >
          <div className="wallet-panel-header">
            <div className="wallet-header-title">
              <Wallet size={20} />
              <span>My Wallet</span>
            </div>
            <div className="wallet-header-badges">
              <span className="wallet-status-badge">Frontend Preview</span>
              <button
                type="button"
                className="wallet-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close wallet preview"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="wallet-panel-body">
            {loading ? (
              <div className="wallet-loading-state">Loading...</div>
            ) : !user ? (
              <div className="wallet-logged-out-view">
                <p>Sign in to access your wallet.</p>
                <button
                  type="button"
                  className="wallet-signin-btn"
                  onClick={handleSignInClick}
                >
                  Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="wallet-balance-card">
                  <div className="wallet-balance-row">
                    <span>Current balance</span>
                    <span className="wallet-balance-value">—</span>
                  </div>
                  <div className="wallet-balance-row">
                    <span>Available balance</span>
                    <span className="wallet-balance-value">—</span>
                  </div>
                  <div className="wallet-balance-row">
                    <span>Pending / held balance</span>
                    <span className="wallet-balance-value">—</span>
                  </div>
                  <div className="wallet-currency-label">Currency: USD</div>
                </div>

                <div className="wallet-action-buttons">
                  <button
                    type="button"
                    className="wallet-action-button"
                    onClick={handleDeposit}
                  >
                    <ArrowDownToLine size={16} />
                    Deposit
                  </button>
                  <button
                    type="button"
                    className="wallet-action-button"
                    onClick={handleWithdraw}
                  >
                    <ArrowUpFromLine size={16} />
                    Withdraw
                  </button>
                </div>

                <div className="wallet-activity-section">
                  <h4>Recent Activity</h4>
                  <p className="wallet-empty-activity">No wallet activity yet.</p>
                </div>
              </>
            )}

            <div className="wallet-safety-notice">
              This is a frontend preview. It is not connected to real funds, wallet balances, deposits, or withdrawals.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}