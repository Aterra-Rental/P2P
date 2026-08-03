import { Link } from "react-router-dom";
import "./LegalPages.css";

const TermsOfService = () => {
  return (
    <div className="Global d-flex flex-column min-vh-100 overflow-hidden">
      <main className="legal-page-container grow">
        <article className="legal-content">
          <header className="legal-header">
            <h1>Terms of Service</h1>

            <div className="legal-meta">
              <span>Last updated: August 2026</span>
              <span className="env-badge">
                University Demonstration Project
              </span>
            </div>
          </header>

          <div className="legal-disclaimer-box">
            <p>
              Financial and Escrow Disclaimer: This platform tracks transaction
              and escrow states for demonstration purposes. It does not hold
              customer bank funds, does not custody real money, and does not
              automatically transfer fiat currency to sellers. Demonstration
              wallet balances are mock credits and cannot be withdrawn.
            </p>
          </div>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              Welcome to our platform. By using the P2P Secure Transaction
              Platform, you agree to follow these terms. If you disagree with
              them, do not use the application.
            </p>
          </section>

          <section>
            <h2>2. What We Provide</h2>
            <p>
              We provide a structured workspace for peer-to-peer deals,
              including deal rooms, role selection, price negotiation, fee
              tracking, mock KHQR or Bakong payment checks, and fulfillment
              tracking.
            </p>
          </section>

          <section>
            <h2>3. User Responsibilities</h2>
            <p>
              You are responsible for protecting your account, providing
              accurate profile information, and reviewing every deal setting
              before confirming roles, amounts, fees, payments, or receipts.
            </p>
          </section>

          <section>
            <h2>4. Deal Progression</h2>
            <p>
              Deals progress when both participants complete the required
              actions. Role, amount, fee, payment, fulfillment, and receipt
              confirmations can change the deal state. Never confirm receipt
              before checking the product or service.
            </p>
          </section>

          <section>
            <h2>5. Prohibited Conduct</h2>
            <p>
              Users must not submit false identity documents, impersonate
              others, commit fraud, upload malicious files, interfere with
              payment demonstrations, spam other users, or use the platform for
              illegal activity.
            </p>
          </section>

          <section>
            <h2>6. Disclaimer and Liability</h2>
            <p>
              This university demonstration project is provided
              &quot;as is&quot; without warranties. The project does not
              guarantee product quality, fulfillment, dispute outcomes, or the
              availability of external payment services.
            </p>
          </section>

          <section>
            <h2>7. Contact</h2>
            <p>
              Questions about these terms should be submitted through the
              project&apos;s Report an Issue or FAQ support feature.
            </p>
          </section>

          <div className="legal-footer-nav">
            <Link to="/" className="legal-back-link">
              ← Return to Home
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
};

export default TermsOfService;