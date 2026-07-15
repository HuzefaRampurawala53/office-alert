import "./Login.css";
import { useState } from "react";
import socket from "../services/socket";

function Login({ onLogin }) {
    const [username, setUsername] = useState("");

    const handleContinue = () => {
        if (!username.trim()) {
            alert("Please enter your name.");
            return;
        }

        const normalizedUsername = username.trim().toLowerCase();
        localStorage.setItem("username", normalizedUsername);

        onLogin(normalizedUsername);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Office Alert</h1>

                <input
                    type="text"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <button onClick={handleContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
}

export default Login;