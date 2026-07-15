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

  socket = io("https://office-alert.onrender.com", {
    auth: { token },
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
