import React, { useState } from "react";
import "../Global.css";
import "./FQA.css";
import Footer from '../../Router/Footer';
import API_URL from "../../lib/api";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "start", label: "Getting Started" },
  { id: "rooms", label: "Rooms & Bot" },
  { id: "pay", label: "Payments & Escrow" },
  { id: "safety", label: "Safety & Scams" },
  { id: "dispute", label: "Disputes & Admins" },
];

const FAQS = [
  { id: "GS-01", cat: "start", q: "How do I start a deal with someone?", a: "Share your room link or invite code with the other party. The moment you're both in, the bot opens a private room, states the ground rules, and asks each of you to confirm what's being exchanged before anything moves forward." },
  { id: "GS-02", cat: "start", q: "Do both people need an account?", a: "Yes. Both the buyer and seller need a verified account before the room opens. This keeps everyone identifiable to our admins if something needs to be looked into later." },
  { id: "GS-03", cat: "start", q: "Is there a fee to use a room?", a: "Opening a room is free. A small service fee only applies once a deal is marked complete and funds are released — you'll see the exact amount before you confirm anything." },
  { id: "RM-01", cat: "rooms", q: "What does the bot actually do in a room?", a: "It creates the private space, logs every message and offer with a timestamp, checks that both sides confirm terms before funds move, and flags anything that looks like a rule violation to our admin queue automatically." },
  { id: "RM-02", cat: "rooms", q: "Can the seller or buyer edit the terms mid-deal?", a: "Either side can propose a change, but the bot locks the room until both people re-confirm the new terms. Nothing is finalized on a one-sided edit." },
  { id: "RM-03", cat: "rooms", q: "Is the room private, or can other users see it?", a: "Rooms are private to the buyer, seller, and the bot. Admins can open a room only if it's reported or flagged — never browsed casually." },
  { id: "PY-01", cat: "pay", q: "How does escrow protect my payment?", a: "Funds are held by the platform the moment the buyer pays — not sent to the seller directly. They're only released once both sides confirm the deal is complete, or an admin approves it after a dispute." },
  { id: "PY-02", cat: "pay", q: "When exactly does the seller get paid?", a: "As soon as the buyer confirms they received what was agreed. If the buyer goes silent, funds auto-release after a set holding window unless a dispute has been opened." },
  { id: "PY-03", cat: "pay", q: "What payment methods are supported?", a: "Card and major bank transfers are supported directly in-room. If someone asks you to pay off-platform, that's a major red flag." },
  { id: "SF-01", cat: "safety", q: "How do you actually prevent scams?", a: "Payment never touches the seller until the buyer confirms, every message is logged, and the bot watches for common scam patterns — like pressure to move off-platform — and flags them for an admin instantly." },
  { id: "SF-02", cat: "safety", q: "Someone is pressuring me to pay outside the room. What do I do?", a: "Stop the conversation and report it immediately using the flag button in the room. This is the single most common scam pattern we see, and it's why payments outside the platform aren't protected at all." },
  { id: "SF-03", cat: "safety", q: "How do I report a suspicious user?", a: "Every room has a report icon in the top corner. It sends the full, timestamped chat log straight to an admin — you don't need to screenshot or explain anything yourself." },
  { id: "DP-01", cat: "dispute", q: "What happens if we disagree over the outcome?", a: "Either party can open a dispute from the room. That pauses fund release, pulls in a human admin who reviews the full bot-logged conversation, and both sides can submit extra evidence before a decision is made." },
  { id: "DP-02", cat: "dispute", q: "How long does an admin review take?", a: "Most disputes are reviewed within 24 hours. You'll get a notification the moment an admin picks it up, and again when a decision is made." },
  { id: "DP-03", cat: "dispute", q: "Can I appeal an admin's decision?", a: "Yes, once. An appeal gets reviewed by a different admin who wasn't on the original case, using the same logged room history." },
];

const FQA = () => {
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const [askQuestion, setAskQuestion] = useState("");
  const [askStatus, setAskStatus] = useState("idle"); // idle | sending | sent | error

  const filtered = FAQS.filter((f) => {
    const inCat = activeCat === "all" || f.cat === activeCat;
    const inSearch =
      search.trim().length === 0 ||
      f.q.toLowerCase().includes(search.toLowerCase());
    return inCat && inSearch;
  });

  function toggle(id) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  async function handleAskSubmit(e) {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    // Reuse the same session shape used elsewhere in the app
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!storedUser?.user_id) {
      setAskStatus("error");
      alert("Please log in before submitting a question.");
      return;
    }
    setAskStatus("sending");
    try {
      const res = await fetch(`${API_URL}/api/faq/submit-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: storedUser?.user_id ?? null,
          question: askQuestion.trim(),
        }),
      });
      if (!res.ok) throw new Error("Request failed");

      setAskStatus("sent");
      setAskQuestion("");
    } catch (err) {
      setAskStatus("error");
    }
  }

  return (
    <div className="Global">
      <div className="Container">
        <h1>Frequently Asked Questions (FAQ)</h1>
        <p className="fa-subtitle">
          Answers to the most common questions about how rooms, payments, and disputes work on the platform.
        </p>

        <div className="fa-search-box">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="fa-search-input"
          />
        </div>

        <div className="fa-cat-list">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`fa-cat-btn${activeCat === c.id ? " active" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="fa-layout">
          <div className="fa-list">
            {filtered.map((f) => {
              const isOpen = openId === f.id;
              return (
                <div key={f.id} className={`fa-item${isOpen ? " open" : ""}`}>
                  <button className="fa-question" onClick={() => toggle(f.id)}>
                    <span>{f.q}</span>
                    <span className="fa-icon">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <div className="fa-answer">{f.a}</div>}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="fa-empty">No questions match that search.</p>
            )}
          </div>

          <div className="fa-ask-box">
            <h2 className="fa-ask-title">Didn't find your answer?</h2>
            <p className="fa-ask-subtitle">
              Submit your question below and our admin team will review it.
            </p>

            {askStatus === "sent" ? (
              <p className="fa-ask-success">
                Thanks — your question was submitted. We'll get back to you.
              </p>
            ) : (
              <form className="fa-ask-form" onSubmit={handleAskSubmit}>
                <textarea
                  placeholder="Type your question here..."
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  className="fa-ask-textarea"
                  rows={4}
                  required
                />
                <button
                  type="submit"
                  className="fa-ask-submit"
                  disabled={askStatus === "sending"}
                >
                  {askStatus === "sending" ? "Sending..." : "Submit Question"}
                </button>
                {askStatus === "error" && (
                  <p className="fa-ask-error">
                    Something went wrong — please try again.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* <Footer /> */}
    </div>
  );
};

export default FQA;