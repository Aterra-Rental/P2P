import { Link } from 'react-router-dom';
import './LegalPages.css';

const PrivacyPolicy = () => {
  return (
    <div className="Global d-flex flex-column min-vh-100 overflow-hidden">
      <main className="legal-page-container grow">
        <article className="legal-content">
          <header className="legal-header">
            <h1>Privacy Policy</h1>
            <div className="legal-meta">
              <span>Last updated: August 2026</span>
              <span className="env-badge">Development Draft</span>
            </div>
          </header>

          <div className="legal-disclaimer-box">
            <p>This document is a development draft for a university project and must receive qualified legal review before production use.</p>
          </div>

          <section>
            <h2>1. Introduction and Scope</h2>
            <p>This Privacy Policy explains how the P2P Secure Transaction Platform (&quot;we,&quot; &quot;our,&quot; or &quot;the platform&quot;) handles information when you visit or use our application. By accessing our services, you understand the processing practices outlined herein.</p>
          </section>

          <section>
            <h2>2. Information the Platform May Collect</h2>
            <p>Depending on your interactions, the application may process:</p>
            <ul>
              <li>Email address and password hash (stored securely using bcrypt hashes, not plaintext).</li>
              <li>Internal user identification numbers and profile metadata.</li>
              <li>Name, phone number, date of birth, physical address, and username.</li>
              <li>National identity numbers and uploaded front/back identity verification images.</li>
              <li>KYC approval status, rejection reasons, reviewer IDs, and review timestamps.</li>
            </ul>
          </section>

          <section>
            <h2>3. Deal, Transaction, and Communication Data</h2>
            <p>To facilitate secure peer-to-peer workflows, we record:</p>
            <ul>
              <li>Room invitations, participant IDs, and deal room codes.</li>
              <li>Item names, descriptions, product types, negotiated amounts, and fee agreements.</li>
              <li>Room chat messages and reminder records.</li>
              <li>Payment attempt metadata, expected amounts, transaction references, and verification statuses.</li>
              <li>Demonstration wallet balances and internal ledger movements.</li>
              <li>Fulfillment proof files, descriptions, courier details, and tracking codes.</li>
              <li>Cancellation requests, dispute records, and support inquiries.</li>
            </ul>
          </section>

          <section>
            <h2>4. Technical Logs and Browser Storage</h2>
            <p>We log technical details necessary to operate and diagnose application behavior. Browser storage (such as local storage or tokens) is used solely for maintaining session state and authenticating your active session.</p>
          </section>

          <section>
            <h2>5. How Information is Shared</h2>
            <p>Information is shared between matched deal participants (buyer and seller) strictly as necessary to execute the transaction workflow (e.g., displaying usernames, negotiated terms, fulfillment proof, and confirmation states). We do not sell personal data to third parties.</p>
          </section>

          <section>
            <h2>6. Security Practices</h2>
            <p>We implement standard cryptographic password hashing, token-based session validation, and role-protected routing. However, no digital platform can claim absolute security.</p>
          </section>

          <section>
            <h2>7. Contact Information</h2>
            <p>For inquiries regarding this privacy draft, contact: [PRIVACY CONTACT EMAIL] at [PROJECT/ORGANIZATION NAME], located in [JURISDICTION].</p>
          </section>

          <div className="legal-footer-nav">
            <Link to="/" className="legal-back-link">← Return to Home</Link>
          </div>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;