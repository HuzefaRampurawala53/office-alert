import "./Login.css";
import { useState } from "react";
import api from "../services/api";

function Login({ onLogin }) {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!employeeId.trim()) {
      setError("Please enter your Employee ID.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        employee_id: employeeId.trim().toUpperCase(),
        password,
      });

      const { token, employee } = res.data;

      // Store in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("employee", JSON.stringify(employee));

      onLogin(employee, token);
    } catch (err) {
      const message =
        err.response?.data?.error || "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🏢</div>
          <h1>Office Alert</h1>
          <p className="login-subtitle">Sign in with your employee credentials</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="employeeId">Employee ID</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="employeeId"
                type="text"
                placeholder="e.g. EMP001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span className="spinner"></span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="login-footer">
          Secure access powered by JWT authentication
        </p>
      </div>
    </div>
  );
}

export default Login;