import "./TransactionCard.css";

const TransactionCard = ({ transaction }) => {
  return (
    <div className="transaction-card">

      <div className="transaction-header">
        <h3>{transaction.item}</h3>

        <span className={`status ${transaction.status.toLowerCase()}`}>
          {transaction.status}
        </span>
      </div>

      <p>
        <strong>Transaction ID:</strong> {transaction.id}
      </p>

      <p>
        <strong>Room ID:</strong> {transaction.roomId}
      </p>

      <p>
        <strong>Partner:</strong> {transaction.partner}
      </p>

      <p>
        <strong>Role:</strong> {transaction.role}
      </p>

      <p>
        <strong>Amount:</strong> ${transaction.amount}
      </p>

      <div className="transaction-footer">
        <span>{transaction.completedAt}</span>

        <button className="details-btn">
          View Details
        </button>
      </div>

    </div>
  );
};

export default TransactionCard;