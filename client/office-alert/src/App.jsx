import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import socket from "./services/socket";

function App() {
  const [username, setUsername] = useState("");

  // Read username from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("username");

    if (savedUser) {
      setUsername(savedUser.trim().toLowerCase());
    }
  }, []);
  //For asking notification
  useEffect(() => {

    if ("Notification" in window) {

        Notification.requestPermission();

    }

}, []);
  // Socket connection and user join handling
  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected:", socket.id);
      if (username) {
        socket.emit("user_join", username);
      }
    };

    socket.on("connect", handleConnect);

    // If socket is already connected when this runs
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [username]);

  const handleLogout = () => {
    localStorage.removeItem("username");
    setUsername("");
  };

  return (
    <>
      {username ? (
        <Home
          username={username}
          onLogout={handleLogout}
        />
      ) : (
        <Login onLogin={setUsername} />
      )}
    </>
  );
}

export default App;