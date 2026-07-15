import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import "./ChatWindow.css";

function ChatWindow({
  currentEmployeeId,
  selectedUser,
  messages,
  setMessages,
  typingUser,
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
    if (!selectedUser) return;

    api
      .get(`/messages/${currentEmployeeId}/${selectedUser}`)
      .then((res) => {
        const history = res.data.map((msg) => ({
          id: msg.id,
          from: msg.sender,
          to: msg.receiver,
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
      .catch((err) => console.error(err));
  }, [selectedUser, currentEmployeeId, setMessages]);

  // ===============================
  // Send Message
  // ===============================
  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("send_message", {
      to: selectedUser,
      message: message.trim(),
    });

    setMessage("");
  };

  // ===============================
  // Mark Messages as Seen
  // ===============================
  useEffect(() => {
    messages.forEach((msg) => {
      if (
        msg.to?.toUpperCase() === currentEmployeeId.toUpperCase() &&
        !msg.seen
      ) {
        socket.emit("message_seen", { id: msg.id });
      }
    });
  }, [messages, currentEmployeeId, socket]);

  // ===============================
  // Auto-scroll to bottom
  // ===============================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-window">

      <div className="chat-header">
        <div>
          <h2>{selectedUser}</h2>
          <span>🟢 Online</span>
        </div>

        <button onClick={onClose}>✖</button>
      </div>

      <div className="chat-messages">
        {messages
          .filter(
            (msg) =>
              (msg.from.toUpperCase() === currentEmployeeId.toUpperCase() &&
                msg.to.toUpperCase() === selectedUser.toUpperCase()) ||
              (msg.from.toUpperCase() === selectedUser.toUpperCase() &&
                msg.to.toUpperCase() === currentEmployeeId.toUpperCase())
          )
          .map((msg) => (
            <div
              key={msg.id}
              className={
                msg.from.toUpperCase() === currentEmployeeId.toUpperCase()
                  ? "my-message"
                  : "their-message"
              }
            >
              <p>{msg.message}</p>
              <span>
                {msg.time}
                {msg.from.toUpperCase() === currentEmployeeId.toUpperCase() && (
                  <>
                    {" "}
                    {msg.seen ? <span className="seen-ticks">✓✓</span> : msg.delivered ? <span className="status-ticks">✓✓</span> : <span className="status-ticks">✓</span>}
                  </>
                )}
              </span>
            </div>
          ))}

        {typingUser && typingUser.toUpperCase() === selectedUser.toUpperCase() && (
          <div className="typing-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          value={message}
          placeholder="Type a message..."
          onChange={(e) => {
            setMessage(e.target.value);

            socket.emit("typing", {
              to: selectedUser,
            });

            clearTimeout(typingTimeout.current);

            typingTimeout.current = setTimeout(() => {
              socket.emit("stop_typing", {
                to: selectedUser,
              });
            }, 2000);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />

        <button onClick={sendMessage}>
          ➤
        </button>
      </div>

    </div>
  );
}

export default ChatWindow;