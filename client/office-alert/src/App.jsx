import { useEffect, useState, useRef } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { createSocket, disconnectSocket } from "./services/socket";

function App() {
  const [employee, setEmployee] = useState(() => {
    const savedEmployee = localStorage.getItem("employee");
    if (savedEmployee) {
      try {
        return JSON.parse(savedEmployee);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("employee");
      }
    }
    return null;
  });

  const [socket, setSocket] = useState(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken && employee) {
      return createSocket(savedToken);
    }
    return null;
  });

  const socketRef = useRef(socket);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

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