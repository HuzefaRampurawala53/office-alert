import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import "./ChatWindow.css";

function ChatWindow({
  currentEmployeeId,
  selectedChat, // { type: 'private' | 'room', id: string|number, name: string }
  messages,
  setMessages,
  typingUser, // { from: string, name: string, room_id?: string|number }
  onClose,
  socket,
}) {
  const [message, setMessage] = useState("");
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  // ===============================
  // Load Chat History
  // ===============================
  useEffect(() => {
    if (!selectedChat) return;

    const fetchUrl =
      selectedChat.type === "room"
        ? `/messages/room/${selectedChat.id}`
        : `/messages/${currentEmployeeId}/${selectedChat.id}`;

    api
      .get(fetchUrl)
      .then((res) => {
        const history = res.data.map((msg) => ({
          id: msg.id,
          from: msg.sender,
          to: msg.receiver,
          room_id: msg.room_id,
          message: msg.message,
          delivered: msg.delivered,
          seen: msg.seen,
          time: new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setMessages(history);
      })
      .catch((err) => console.error("Error loading chat history:", err));
  }, [selectedChat, currentEmployeeId, setMessages]);

  // ===============================
  // Send Message
  // ===============================
  const sendMessage = () => {
    if (!message.trim()) return;

    if (selectedChat.type === "room") {
      socket.emit("send_message", {
        room_id: selectedChat.id,
        message: message.trim(),
      });
    } else {
      socket.emit("send_message", {
        to: selectedChat.id,
        message: message.trim(),
      });
    }

    setMessage("");
  };

  // ===============================
  // Mark Private Messages as Seen
  // ===============================
  useEffect(() => {
    if (selectedChat && selectedChat.type === "private") {
      messages.forEach((msg) => {
        if (
          msg.to?.toUpperCase() === currentEmployeeId.toUpperCase() &&
          msg.from?.toUpperCase() === selectedChat.id.toUpperCase() &&
          !msg.seen
        ) {
          socket.emit("message_seen", { id: msg.id });
        }
      });
    }
  }, [messages, currentEmployeeId, selectedChat, socket]);

  // ===============================
  // Auto-scroll to bottom
  // ===============================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages appropriate for the active chat
  const activeMessages = messages.filter((msg) => {
    if (selectedChat.type === "room") {
      return msg.room_id !== null && String(msg.room_id) === String(selectedChat.id);
    } else {
      return (
        msg.room_id === null &&
        ((msg.from.toUpperCase() === currentEmployeeId.toUpperCase() &&
          msg.to.toUpperCase() === selectedChat.id.toUpperCase()) ||
          (msg.from.toUpperCase() === selectedChat.id.toUpperCase() &&
            msg.to.toUpperCase() === currentEmployeeId.toUpperCase()))
      );
    }
  });

  // Check if currently typing in this chat
  const showTypingIndicator = () => {
    if (!typingUser) return false;
    if (selectedChat.type === "room") {
      return (
        typingUser.room_id !== null &&
        String(typingUser.room_id) === String(selectedChat.id) &&
        typingUser.from.toUpperCase() !== currentEmployeeId.toUpperCase()
      );
    } else {
      return (
        !typingUser.room_id &&
        typingUser.from.toUpperCase() === selectedChat.id.toUpperCase()
      );
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div>
          <h2>
            {selectedChat.type === "room" ? `# ${selectedChat.name}` : selectedChat.name}
          </h2>
          <span>
            {selectedChat.type === "room"
              ? "Channel Discussion"
              : `Employee ID: ${selectedChat.id}`}
          </span>
        </div>

        <button onClick={onClose} className="close-chat-btn">✖</button>
      </div>

      <div className="chat-messages">
        {activeMessages.map((msg) => {
          const isMe = msg.from.toUpperCase() === currentEmployeeId.toUpperCase();
          return (
            <div key={msg.id} className={isMe ? "my-message" : "their-message"}>
              {!isMe && selectedChat.type === "room" && (
                <span className="message-sender-name">{msg.from}</span>
              )}
              <p>{msg.message}</p>
              <span>
                {msg.time}
                {isMe && selectedChat.type === "private" && (
                  <>
                    {" "}
                    {msg.seen ? (
                      <span className="seen-ticks">✓✓</span>
                    ) : msg.delivered ? (
                      <span className="status-ticks">✓✓</span>
                    ) : (
                      <span className="status-ticks">✓</span>
                    )}
                  </>
                )}
              </span>
            </div>
          );
        })}

        {showTypingIndicator() && (
          <div className="typing-container-badge">
            <span className="typing-name">
              {selectedChat.type === "room" ? typingUser.name : ""} Typing
            </span>
            <div className="typing-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          value={message}
          placeholder={
            selectedChat.type === "room"
              ? "Message channel..."
              : "Type a message..."
          }
          onChange={(e) => {
            setMessage(e.target.value);

            if (selectedChat.type === "room") {
              socket.emit("typing", { room_id: selectedChat.id });
            } else {
              socket.emit("typing", { to: selectedChat.id });
            }

            clearTimeout(typingTimeout.current);

            typingTimeout.current = setTimeout(() => {
              if (selectedChat.type === "room") {
                socket.emit("stop_typing", { room_id: selectedChat.id });
              } else {
                socket.emit("stop_typing", { to: selectedChat.id });
              }
            }, 2000);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />

        <button onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
}

export default ChatWindow;