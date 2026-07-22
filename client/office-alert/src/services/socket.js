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

  const isLocalhost = 
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1" || 
    window.location.hostname === "[::1]" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.startsWith("10.") ||
    window.location.hostname.startsWith("172.");

  const socketURL = isLocalhost
    ? "http://localhost:4000"
    : import.meta.env.VITE_API_URL || "https://office-alert.onrender.com";

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
