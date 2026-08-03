import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { socket } from "../../../../lib/socket";
import {
  getMessages,
  sendMessage,
} from "../../lib/message";
import MessageBubble from "./MessageBubble";
import "./ChatBox.css";

const MAX_MESSAGE_LENGTH = 1000;


const ChatBox = ({ room, userId }) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesContainerRef = useRef(null);
  const latestLoadIdRef = useRef(0);
  const roomCode = room.room_code;

  const isReadOnly =
    ["Completed", "Cancelled"].includes(room.status) ||
    ["Completed", "Cancelled"].includes(
      room.current_step
    );

    const loadMessages = useCallback(async () => {
    const loadId = latestLoadIdRef.current + 1;
    latestLoadIdRef.current = loadId;

    try {
      const result = await getMessages(roomCode);

      if (loadId !== latestLoadIdRef.current) {
        return false;
      }

      setMessages(
        Array.isArray(result.messages)
          ? result.messages
          : []
      );

      return true;
    } catch (loadError) {
      if (loadId !== latestLoadIdRef.current) {
        return false;
      }

      throw loadError;
    }
  }, [roomCode]);

  useEffect(() => {
    let cancelled = false;

    const refreshMessages = () => {
      loadMessages()
        .then((wasApplied) => {
          if (cancelled || !wasApplied) {
            return;
          }

          setError("");
          setLoading(false);
        })
        .catch((loadError) => {
          if (cancelled) return;

          setError(
            loadError.message ||
              "Unable to refresh deal messages."
          );
          setLoading(false);
        });
    };

    const handleMessageCreated = (payload) => {
      if (payload.room_code !== roomCode) {
        return;
      }

      refreshMessages();
    };

    const handleSocketReconnect = () => {
      refreshMessages();
    };

    const handleWindowFocus = () => {
      refreshMessages();
    };

    socket.on(
      "message_created",
      handleMessageCreated
    );
    socket.on(
      "connect",
      handleSocketReconnect
    );
    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    const initialLoadTimer = window.setTimeout(
      refreshMessages,
      0
    );

    return () => {
      cancelled = true;
      window.clearTimeout(initialLoadTimer);

      socket.off(
        "message_created",
        handleMessageCreated
      );
      socket.off(
        "connect",
        handleSocketReconnect
      );
      window.removeEventListener(
        "focus",
        handleWindowFocus
      );
    };
  }, [loadMessages, roomCode]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanMessage = draft.trim();

    if (
      !cleanMessage ||
      sending ||
      isReadOnly
    ) {
      return;
    }

    try {
      setSending(true);
      setError("");

      await sendMessage(
        roomCode,
        cleanMessage
      );

      setDraft("");
      await loadMessages();
    } catch (sendError) {
      setError(
        sendError.message ||
          "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  };

  const handleDraftKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="deal-chat">
      <div
        ref={messagesContainerRef}
        className="deal-chat-messages"
        aria-live="polite"
      >
        {loading && (
          <div className="deal-chat-state">
            Loading messages...
          </div>
        )}

        {!loading &&
          !error &&
          messages.length === 0 && (
            <div className="deal-chat-state">
              No messages yet. Start the conversation.
            </div>
          )}

        {messages.map((message) => (
          <MessageBubble
            key={message.message_id}
            message={message}
            currentUserId={userId}
          />
        ))}
      </div>

      {error && (
        <div className="deal-chat-error">
          {error}
        </div>
      )}

      {isReadOnly ? (
        <div className="deal-chat-read-only">
          This conversation is now read-only.
        </div>
      ) : (
        <form
          className="deal-chat-form"
          onSubmit={handleSubmit}
        >
          <textarea
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            placeholder="Write a message..."
            aria-label="Deal message"
            disabled={sending}
            onChange={(event) =>
              setDraft(event.target.value)
            }
            onKeyDown={handleDraftKeyDown}
          />

          <div className="deal-chat-form-footer">
            <small>
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </small>

            <button
              type="submit"
              disabled={
                sending ||
                draft.trim().length === 0
              }
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};


export default ChatBox;