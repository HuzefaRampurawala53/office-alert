import { io } from "socket.io-client";

let socket = null;

/**
 * Create (or return existing) socket connection with JWT auth.
 * Call this after login when you have a valid token.
 */
export function createSocket(token) {
  if (socket && socket.connected) {
    return socket;
  }

  const socketURL = window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://office-alert.onrender.com";

  const presenceStatus = localStorage.getItem("presence_status") || "online";

  socket = io(socketURL, {
    auth: { token, presenceStatus },
  });

  return socket;
}

/**
 * Get the current socket instance.
 * Returns null if not connected yet.
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect and clear the socket instance.
 * Call this on logout.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { createSocket, getSocket, disconnectSocket };
