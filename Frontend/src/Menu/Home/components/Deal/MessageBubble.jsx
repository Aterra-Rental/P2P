const messageTimeFormatter = new Intl.DateTimeFormat(
  undefined,
  {
    hour: "2-digit",
    minute: "2-digit",
  }
);


const MessageBubble = ({
  message,
  currentUserId,
}) => {
  const isOwnMessage =
    Number(message.sender_id) ===
    Number(currentUserId);

  const createdAt = message.created_at
    ? new Date(message.created_at)
    : null;

  const hasValidDate =
    createdAt &&
    !Number.isNaN(createdAt.getTime());

  const formattedTime = hasValidDate
    ? messageTimeFormatter.format(createdAt)
    : "";

  return (
    <div
      className={
        isOwnMessage
          ? "chat-message-row chat-message-row-own"
          : "chat-message-row chat-message-row-partner"
      }
    >
      <div className="chat-message-bubble">
        <div className="chat-message-meta">
          <span>
            {isOwnMessage ? "You" : "Partner"}
          </span>

          {formattedTime && (
            <time dateTime={message.created_at}>
              {formattedTime}
            </time>
          )}
        </div>

        <p>{message.message}</p>
      </div>
    </div>
  );
};


export default MessageBubble;