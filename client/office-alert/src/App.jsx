import { useEffect, useState, useRef } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { createSocket, disconnectSocket, getSocket } from "./services/socket";

function App() {
  const [employee, setEmployee] = useState(null);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedEmployee = localStorage.getItem("employee");

    if (savedToken && savedEmployee) {
      try {
        const emp = JSON.parse(savedEmployee);
        setEmployee(emp);

        // Reconnect socket with saved token
        const sock = createSocket(savedToken);
        socketRef.current = sock;
        setSocket(sock);
      } catch {
        // Corrupted data — clear and go to login
        localStorage.removeItem("token");
        localStorage.removeItem("employee");
      }
    }
  }, []);

  // Ask for notification permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Handle successful login
  const handleLogin = (emp, token) => {
    setEmployee(emp);

    const sock = createSocket(token);
    socketRef.current = sock;
    setSocket(sock);
  };

  // Handle logout
  const handleLogout = () => {
    disconnectSocket();
    socketRef.current = null;
    setSocket(null);

    localStorage.removeItem("token");
    localStorage.removeItem("employee");
    setEmployee(null);
  };

  return (
    <>
      {employee && socket ? (
        <Home
          employee={employee}
          socket={socket}
          onLogout={handleLogout}
        />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;