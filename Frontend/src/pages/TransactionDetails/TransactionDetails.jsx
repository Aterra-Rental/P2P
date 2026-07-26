import "./TransactionDetails.css";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";


export default function TransactionDetails() {
    const navigate = useNavigate();
    const { transactionId } = useParams();
    const [transaction, setTransaction] = useState(null)
    useEffect(() => {
    fetch(`/api/transactions/${transactionId}`)
        .then(res => res.json())
        .then(data => setTransaction(data));
}, [transactionId]);
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
          <strong>{transactionId}</strong>
        </div>

        <div className="info-row">
          <span>Room ID</span>
          <strong>{transaction.roomId}</strong>
        </div>

        <div className="info-row">
          <span>Item</span>
          <strong>{transaction.item}</strong>
        </div>
      </div>
        <div className="details-card">

    <h2>Participants</h2>

    <div className="info-row">
      <span>Buyer</span>
      <strong>
        {transaction.buyer.name} ({transaction.buyer.id})
      </strong>
    </div>

    <div className="info-row">
      <span>Seller</span>
      <strong>
        {transaction.seller.name} ({transaction.seller.id})
      </strong>
    </div>

  </div>
    {/* Payment */}
<div className="details-card">

  <h2>Payment</h2>

  <div className="info-row">
    <span>Amount</span>
    <strong>${transaction.amount}</strong>
  </div>

  <div className="info-row">
    <span>Escrow Fee</span>
    <strong>${transaction.escrowFee}</strong>
  </div>

  <div className="info-row">
    <span>Total Paid</span>
    <strong>${transaction.totalPaid}</strong>
  </div>

  <div className="info-row">
    <span>Payment Method</span>
    <strong>{transaction.paymentMethod}</strong>
  </div>

</div>
{/* Timeline */}
<div className="details-card">

  <h2>Timeline</h2>

  <div className="info-row">
    <span>Payment Received</span>
    <strong>{transaction.paidAt}</strong>
  </div>

  <div className="info-row">
    <span>Escrow Released</span>
    <strong>{transaction.releasedAt}</strong>
  </div>

  <div className="info-row">
    <span>Transaction Completed</span>
    <strong>{transaction.completedAt}</strong>
  </div>

</div>
    </div>
  );
}