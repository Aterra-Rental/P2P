import { Link } from 'react-router-dom';
import './LegalPages.css';

const TermsOfService = () => {
  return (
    <div className="Global d-flex flex-column min-vh-100 overflow-hidden">
      <main className="legal-page-container grow">
        <article className="legal-content">
          <header className="legal-header">
            <h1>Terms of Service</h1>
            <div className="legal-meta">
              <span>Last updated: August 2026[cite: 1]</span>
              <span className="env-badge">University Demonstration Project[cite: 1]</span>
            </div>
          </header>

          <div className="legal-disclaimer-box">
            <p>Financial and Escrow Disclaimer: This platform tracks transaction and escrow states for demonstration purposes. It does not hold customer bank funds, does not custody real money, and does not automatically transfer fiat currency to sellers. Demonstration wallet balances are mock credits and cannot be withdrawn.[cite: 1]</p>
          </div>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>Welcome to our platform. By jumping in and using the P2P Secure Transaction Platform, you agree to follow these rules. If these terms aren't your thing, it's best to step away and not use the app[cite: 1].</p>
          </section>

          <section>
            <h2>2. What We Provide</h2>
            <p>We give you a structured workspace for peer-to-peer deals. This includes a helpful bot to coordinate rooms, role picking, price chats, fee tracking, mock KHQR/Bakong payment checks, and tracking how your fulfillment goes[cite: 1].</p>
          </section>

          <section>
            <h2>3. Who Can Use It & Your Duties</h2>
            <p>You need to be at least [MINIMUM USER AGE] years old and pass any profile checks we ask for. You're completely responsible for keeping your account locked down and double-checking every deal setting before you lock in roles, prices, or receipts[cite: 1].</p>
          </section>

          <section>
            <h2>4. How Deals Move Forward</h2>
            <p>Things only move forward when you and the other person take action. Choosing roles, confirming numbers, agreeing on fees, checking payments, and confirming receipts actually change the app's state. Seriously, never click that you got your stuff until you've actually checked it[cite: 1].</p>
          </section>

          <section>
            <h2>5. Rules of the Road</h2>
            <p>Don't mess around. That means no fake ID docs, no pretending to be someone else, no scams, no uploading weird files or malware, no breaking the payment mock tests, no spamming reminders, and definitely no using this for sketchy illegal stuff[cite: 1].</p>
          </section>

          <section>
            <h2>6. No Guarantees & Liability Limits</h2>
            <p>We're putting this out &quot;as is&quot; without any warranties. The project crew, devs, and school are totally off the hook if you run into trade disputes, bad product quality, or mock money losses[cite: 1].</p>
          </section>

          <section>
            <h2>7. Legal Stuff & Getting in Touch</h2>
            <p>These terms follow the laws of [GOVERNING LAW]. Got questions or legal stuff to talk about? Hit us up at [LEGAL CONTACT EMAIL][cite: 1].</p>
          </section>

          <div className="legal-footer-nav">
            <Link to="/" className="legal-back-link">← Return to Home</Link>
          </div>
        </article>
      </main>
    </div>
  );
};

export default TermsOfService;