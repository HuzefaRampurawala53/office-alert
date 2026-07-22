import axios from "axios";

const isLocalhost = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1" || 
  window.location.hostname === "[::1]" ||
  window.location.hostname.startsWith("192.168.") ||
  window.location.hostname.startsWith("10.") ||
  window.location.hostname.startsWith("172.");

const baseURL = isLocalhost
  ? "http://localhost:4000"
  : import.meta.env.VITE_API_URL || "https://office-alert.onrender.com";

const api = axios.create({
  baseURL,
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses globally (token expired, etc.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response && 
      error.response.status === 401 && 
      error.config && 
      !error.config.url?.includes("/auth/login")
    ) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("employee");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
