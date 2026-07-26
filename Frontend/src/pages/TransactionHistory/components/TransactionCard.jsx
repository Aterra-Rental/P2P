import "./TransactionCard.css";
import { useNavigate } from "react-router-dom";
const TransactionCard = ({ transaction }) => {
    const navigate = useNavigate();
  return (
    <div className="transaction-card">

      <div className="transaction-top">
        <div>
          <h3>{transaction.item}</h3>
          <small>TX-{transaction.transactionId}</small>
        </div>

        <span className={`status ${transaction.status.toLowerCase()}`}>
          {transaction.status}
        </span>
      </div>

      <div className="transaction-info">
        <p> <strong>Partner:</strong> {transaction.partner} <span className="partner-id"> {" "} ({transaction.partnerId})</span> </p>
        <p><strong>Room:</strong> {transaction.roomId}</p>
      </div>

      <div className="transaction-bottom">
        <div>
          <strong>{transaction.role}</strong>
          <p>${transaction.amount}</p>
        </div>

        <div className="transaction-actions">
          <small>{transaction.completedAt}</small>

          <button
    className="details-btn"
    onClick={() => {
        console.log("Transaction object:", transaction);
        console.log("transactionId:", transaction.transactionId);

        navigate(`/transaction/${transaction.transactionId}`);
    }}
>
    View Details
</button>
        </div>
      </div>

    </div>
  );
};

export default TransactionCard;