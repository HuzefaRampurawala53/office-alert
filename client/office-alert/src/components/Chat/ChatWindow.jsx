import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../../services/socket";
import "./ChatWindow.css";
import {useRef} from 'react';
function ChatWindow({
  currentUser,
  selectedUser,
  messages,
  setMessages,
  typingUser,
  onClose,
}) {
  const [message, setMessage] = useState("");
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);
  // ===============================
  // Load Chat History
  // ===============================
  useEffect(() => {
    if (!selectedUser) return;

    axios
      .get(
        `http://localhost:4000/messages/${currentUser.trim().toLowerCase()}/${selectedUser.trim().toLowerCase()}`
      )
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
  }, [selectedUser, currentUser, setMessages]);

  // ===============================
  // Send Message
  // ===============================
  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("send_message", {
      from: currentUser.trim().toLowerCase(),
      to: selectedUser.trim().toLowerCase(),
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
        msg.to?.toLowerCase() === currentUser.toLowerCase() &&
        !msg.seen
      ) {
        socket.emit("message_seen", { id: msg.id });
      }
    });
  }, [messages, currentUser]);

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
              (msg.from.toLowerCase() === currentUser.toLowerCase() &&
                msg.to.toLowerCase() === selectedUser.toLowerCase()) ||
              (msg.from.toLowerCase() === selectedUser.toLowerCase() &&
                msg.to.toLowerCase() === currentUser.toLowerCase())
          )
          .map((msg) => (
            <div
              key={msg.id}
              className={
                msg.from.toLowerCase() === currentUser.toLowerCase()
                  ? "my-message"
                  : "their-message"
              }
            >
              <p>{msg.message}</p>
              <span>
                {msg.time}
                {msg.from.toLowerCase() === currentUser.toLowerCase() && (
                  <>
                    {" "}
                    {msg.seen ? <span className="seen-ticks">✓✓</span> : msg.delivered ? <span className="status-ticks">✓✓</span> : <span className="status-ticks">✓</span>}
                  </>
                )}
              </span>
            </div>
          ))}

        {typingUser && typingUser.toLowerCase() === selectedUser.toLowerCase() && (
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

        from: currentUser,

        to: selectedUser,

    });

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {

        socket.emit("stop_typing", {

            from: currentUser,

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