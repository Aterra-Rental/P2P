import "./TransactionDetails.css";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";


export default function TransactionDetails() {
    const navigate = useNavigate();
    const { transactionId } = useParams();
    console.log("URL transactionId =", transactionId);
    const [transaction, setTransaction] = useState(null)

    useEffect(() => {
    fetch(`/api/transactions/${transactionId}`)
        .then(res => {
            console.log("Status:", res.status);
            return res.json();
        })
        .then(data => {
            console.log("Transaction:", data);
            setTransaction(data);
        })
        .catch(err => {
            console.error("Fetch error:", err);
        });
}, [transactionId]);
if (!transaction) {
    return (
        <div className="transaction-details-page">
            <h2>Loading transaction...</h2>
        </div>
    );
}
  return (
    <div className="transaction-details-page">
        <button
  className="back-btn"
  onClick={() => navigate(-1)}
>
  ← Back to Transaction History
</button>
      <div className="page-header">
        <h1>Transaction Details</h1>

        <span className="status completed">
          {transaction.status}
        </span>
      </div>

      {/* Transaction Information */}
      <div className="details-card">

        <h2>Transaction Information</h2>

        <div className="info-row">
          <span>Transaction ID</span>
          <strong>{transaction.transactionId}</strong>
        </div>

        <div className="info-row">
          <span>Room ID</span>
          <strong>{transaction.roomId}</strong>
        </div>

        <div className="info-row">
          <span>Item</span>
          <strong>{transaction.item}</strong>
        </div>
        <div className="info-row">
    <span>Description</span>
    <strong>{transaction.description}</strong>
</div>
      </div>
        <div className="details-card">

    <h2>Participants</h2>

    <div className="info-row">
        <span>Buyer</span>
        <strong>
            {transaction.buyer.firstName} {transaction.buyer.lastName}
        </strong>
    </div>

    <div className="info-row">
        <span>Seller</span>
        <strong>
            {transaction.seller.firstName} {transaction.seller.lastName}
        </strong>
    </div>

</div>
    {/* Payment */}
<div className="details-card">

    <h2>Payment</h2>

    <div className="info-row">
        <span>Agreed Price</span>
        <strong>${transaction.agreedPrice}</strong>
    </div>

    <div className="info-row">
        <span>Escrow Fee</span>
        <strong>${transaction.fee}</strong>
    </div>

    <div className="info-row">
        <span>Seller Receives</span>
        <strong>${transaction.sellerReceive}</strong>
    </div>

    <div className="info-row">
        <span>Platform Income</span>
        <strong>${transaction.platformIncome}</strong>
    </div>

</div>
{/* Timeline */}
<div className="details-card">

    <h2>Timeline</h2>

    <div className="info-row">
        <span>Created</span>
        <strong>{transaction.createdAt}</strong>
    </div>

    <div className="info-row">
        <span>Completed</span>
        <strong>
            {transaction.completedAt || "Pending"}
        </strong>
    </div>

</div>
    </div>
  );
}