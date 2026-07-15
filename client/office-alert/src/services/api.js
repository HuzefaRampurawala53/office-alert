import axios from "axios";

const api = axios.create({
  baseURL: "https://office-alert.onrender.com",
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
    if (error.response && error.response.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("employee");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
