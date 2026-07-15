import { useEffect, useState, useRef } from "react";
import socket from "../services/socket";
import { notify, clearNotificationCount } from "../utils/NotificationManager";

import "./Home.css";

import bellSound from "../assets/sounds/bell.mp3";

import UserCard from "../components/UserCard";
import Notification from "../components/Notifications/Notification";
import ChatWindow from "../components/Chat/ChatWindow";

function Home({ username, onLogout }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [caller, setCaller] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [typingUser,setTypingUser]=useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);

  const bellRef = useRef(new Audio(bellSound));

  // ===========================
  // ONLINE USERS
  // ===========================
  useEffect(() => {
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("online_users");
    };
  }, []);

  // ===========================
  // BELL
  // ===========================
  useEffect(() => {
    socket.on("bell_ring", (data) => {
      setCaller(data.from);
      setShowNotification(true);

      // Windows notification (manager checks focus internally)
      notify({ type: "bell", sender: data.from });

      bellRef.current.currentTime = 0;
      bellRef.current.play();
    });

    return () => {
      socket.off("bell_ring");
    };
  }, []);

  // ===========================
  // RECEIVE CHAT
  // ===========================
  useEffect(() => {
    socket.on("receive_message", (data) => {
      console.log("MESSAGE RECEIVED", data);

      setMessages((prev) => [...prev, data]);

      socket.emit("message_delivered", { id: data.id });

      // Only notify if someone ELSE sent the message
      if (data.from.toLowerCase() !== username.toLowerCase()) {
        notify({ type: "message", sender: data.from, body: data.message });
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [username]);
  useEffect(()=>{

socket.on("user_typing",(data)=>{

setTypingUser(data.from);

});

socket.on("user_stop_typing",()=>{

setTypingUser("");

});

return()=>{

socket.off("user_typing");

socket.off("user_stop_typing");

};

},[]);

  // ===========================
  // DELIVERED / SEEN UPDATES
  // ===========================
  useEffect(() => {
    socket.on("message_delivered_update", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, delivered: true } : msg
        )
      );
    });

    socket.on("message_seen_update", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, seen: true } : msg
        )
      );
    });

    return () => {
      socket.off("message_delivered_update");
      socket.off("message_seen_update");
    };
  }, []);
  // ===========================
  // OPEN CHAT FROM NOTIFICATION
  // ===========================
  useEffect(() => {
    const handler = (event) => {
      setSelectedUser(event.detail);
    };

    window.addEventListener("open-chat", handler);

    return () => {
      window.removeEventListener("open-chat", handler);
    };
  }, []);

  // ===========================
  // AUTO HIDE NOTIFICATION
  // ===========================
  useEffect(() => {
    if (!showNotification) return;

    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 7000);

    return () => clearTimeout(timer);
  }, [showNotification]);

  // ===========================
  // CHAT
  // ===========================
  const openChat = (user) => {
    setSelectedUser(user);
    clearNotificationCount(user);
  };

  const closeChat = () => {
    setSelectedUser(null);
  };

  return (
    <div className="home-container">

      <div className="top-bar">
        <button
          className="logout-btn"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>

      <h1 className="welcome-title">
        Welcome, {username}
      </h1>

      <div className="users-panel">

        <h3 className="panel-heading">
          🟢 Online ({onlineUsers.length})
        </h3>

        <div className="users-list">

          {onlineUsers.map((user) => (
            <UserCard
              key={user}
              user={user}
              currentUser={username}
              openChat={openChat}
            />
          ))}

        </div>

      </div>

      <Notification
        caller={caller}
        visible={showNotification}
      />

      {selectedUser && (
        <ChatWindow

currentUser={username}

selectedUser={selectedUser}

messages={messages}

setMessages={setMessages}

typingUser={typingUser}

onClose={closeChat}

/>
      )}

    </div>
  );
}

export default Home;
