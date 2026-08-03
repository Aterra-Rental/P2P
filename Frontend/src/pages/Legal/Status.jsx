import { Link } from "react-router-dom";
import "./LegalPages.css";

const Status = () => {
  const statuses = [
    {
      name: "React / Vite Frontend",
      state: "Implemented",
      type: "implemented",
    },
    {
      name: "Flask REST API",
      state: "Implemented",
      type: "implemented",
    },
    {
      name: "PostgreSQL Database",
      state: "Required local service",
      type: "pending",
    },
    {
      name: "Socket.IO Synchronization",
      state: "Implemented; regression testing active",
      type: "implemented",
    },
    {
      name: "User Authentication",
      state: "Implemented with bcrypt & JWT",
      type: "implemented",
    },
    {
      name: "Profile & KYC Review",
      state: "Implemented",
      type: "implemented",
    },
    {
      name: "Deal Rooms & Invitations",
      state: "Implemented",
      type: "implemented",
    },
    {
      name: "Role, Amount & Fee Flow",
      state: "Implemented; E2E verification active",
      type: "pending",
    },
    {
      name: "Demonstration Wallet",
      state: "Demonstration only",
      type: "demo",
    },
    {
      name: "KHQR / Bakong Verification",
      state: "Mock / Configured verification mode",
      type: "demo",
    },
    {
      name: "Fulfillment & Completion",
      state: "Implemented",
      type: "implemented",
    },
    {
      name: "Mutual Cancellation",
      state: "Implemented",
      type: "implemented",
    },
    {
      name: "Transaction History",
      state: "Implemented for completed deals",
      type: "implemented",
    },
    {
      name: "Dispute Workflow",
      state: "Under development",
      type: "dev",
    },
    {
      name: "Production Monitoring",
      state: "Not configured for production",
      type: "dev",
    },
  ];

  return (
    <div className="Global d-flex flex-column min-vh-100 overflow-hidden">
      <main className="legal-page-container grow">
        <article className="legal-content">
          <header className="legal-header">
            <h1>P2P System Status</h1>

            <div className="legal-meta">
              <span>Last updated: August 2026</span>
              <span className="env-badge">
                Development / Demonstration Environment
              </span>
            </div>
          </header>

          <div className="legal-disclaimer-box">
            <p>
              This page reports implementation status for development
              evaluation, not guaranteed live uptime. The platform does not
              custody real bank funds.
            </p>
          </div>

          <div className="status-grid">
            {statuses.map((item) => (
              <div key={item.name} className="status-item">
                <span className="status-label">{item.name}</span>
                <span className={`status-badge ${item.type}`}>
                  {item.state}
                </span>
              </div>
            ))}
          </div>

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

export default Status;