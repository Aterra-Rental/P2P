import React from "react";
import "../Global.css";
import "./Feature.css";
import Footer from "../../Router/Footer";
const Feature = () => {
  return (
    <div className="Global py-10">

      {/* ================= OUR FEATURES ================= */}

      <section className="max-w-7xl mx-auto px-5 mt-5">

        <h1 className="text-center mb-12">Our Features</h1>

        <div className="For-box grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          <div className="box">
            <i className="bi bi-shield-lock-fill"></i>
            <h3>Secure Transactions</h3>
            <p>
              Every transaction is securely recorded and protected to ensure a
              safe trading experience.
            </p>
          </div>

          <div className="box">
            <i className="bi bi-house-lock-fill"></i>
            <h3>Room-Based Trading</h3>
            <p>
              Create private trading rooms and invite only trusted trading
              partners.
            </p>
          </div>

          <div className="box">
            <i className="bi bi-chat-dots-fill"></i>
            <h3>Real-Time Chat</h3>
            <p>
              Communicate instantly with your trading partner inside every room.
            </p>
          </div>

          <div className="box">
            <i className="bi bi-credit-card-2-front-fill"></i>
            <h3>Payment Verification</h3>
            <p>
              Payments are verified automatically before the transaction
              proceeds.
            </p>
          </div>

          <div className="box">
            <i className="bi bi-graph-up-arrow"></i>
            <h3>Transaction Tracking</h3>
            <p>
              Follow every stage of your transaction from beginning to end.
            </p>
          </div>

          <div className="box">
            <i className="bi bi-star-fill"></i>
            <h3>User Ratings</h3>
            <p>
              Build trust by rating and reviewing users after each completed
              transaction.
            </p>
          </div>

        </div>

      </section>

      {/* ================= HOW IT WORKS ================= */}

      <section className="max-w-7xl mx-auto px-5 mt-5">

        <h1 className="text-center mb-12">How It Works</h1>

        <div className="For-box grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          <div className="boxf">
            <i className="bi bi-plus-circle-fill"></i>
            <h3>Create Room</h3>
            <p>Create a secure trading room in just a few seconds.</p>
          </div>

          <div className="boxf">
            <i className="bi bi-person-plus-fill"></i>
            <h3>Invite Partner</h3>
            <p>Invite the buyer or seller and assign each user's role.</p>
          </div>

          <div className="boxf">
            <i className="bi bi-cash-stack"></i>
            <h3>Confirm Amount</h3>
            <p>Both parties confirm the agreed transaction amount.</p>
          </div>

          <div className="boxf">
            <i className="bi bi-wallet2"></i>
            <h3>Deposit Money</h3>
            <p>Buyer deposits funds securely into the platform.</p>
          </div>

          <div className="boxf">
            <i className="bi bi-check-circle-fill"></i>
            <h3>Complete Deal</h3>
            <p>
              After confirmation, payment is released safely to the seller.
            </p>
          </div>

          <div className="boxf">
            <i className="bi bi-award-fill"></i>
            <h3>Leave Review</h3>
            <p>Both users rate each other after the successful trade.</p>
          </div>

        </div>

      </section>

      {/* ================= SECURITY & COMPARISON ================= */}

      <section className="max-w-7xl mx-auto px-5 mt-5 flex flex-col xl:flex-row gap-8">

        {/* Left */}

        <div className="security-card flex-1">

          <h2 className="text-center mb-8">Security You Can Trust</h2>

          <div className="grid grid-cols-2 gap-5">

            <div className="mini-box">
              <i className="bi bi-patch-check-fill"></i>
              <h4>Verified Accounts</h4>
              <p>Every user is verified before trading.</p>
            </div>

            <div className="mini-box">
              <i className="bi bi-lock-fill"></i>
              <h4>Encrypted Data</h4>
              <p>Personal information is encrypted and protected.</p>
            </div>

            <div className="mini-box">
              <i className="bi bi-clock-history"></i>
              <h4>Transaction History</h4>
              <p>Every transaction is permanently recorded.</p>
            </div>

            <div className="mini-box">
              <i className="bi bi-receipt-cutoff"></i>
              <h4>Payment Proof</h4>
              <p>Upload payment proof quickly and securely.</p>
            </div>

            <div className="mini-box">
              <i className="bi bi-shield-check"></i>
              <h4>Fraud Prevention</h4>
              <p>Suspicious activities are automatically detected.</p>
            </div>

            <div className="mini-box">
              <i className="bi bi-eye-fill"></i>
              <h4>Admin Monitoring</h4>
              <p>Administrators monitor transactions and disputes.</p>
            </div>

          </div>

        </div>

        {/* Right */}

        <div className="compare-card flex-1">

          <h2 className="text-center mb-8">Why Choose SafeTrade?</h2>

          <table>

            <thead>

              <tr>
                <th>Traditional Trading</th>
                <th>SafeTrade</th>
              </tr>

            </thead>

            <tbody>

              <tr>
                <td>No transaction history</td>
                <td>Complete transaction records</td>
              </tr>

              <tr>
                <td>High scam risk</td>
                <td>Verified users & fraud protection</td>
              </tr>

              <tr>
                <td>No payment verification</td>
                <td>Secure payment verification</td>
              </tr>

              <tr>
                <td>No dispute support</td>
                <td>Dedicated admin assistance</td>
              </tr>

              <tr>
                <td>Limited transparency</td>
                <td>Track every trading step</td>
              </tr>

              <tr>
                <td>No reputation system</td>
                <td>User ratings & reviews</td>
              </tr>

            </tbody>

          </table>

        </div>

      </section>
    {/* <Footer/> */}
    </div>
  );
};

export default Feature;