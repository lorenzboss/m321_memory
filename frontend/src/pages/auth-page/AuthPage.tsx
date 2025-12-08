import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateUsername = (value: string) => {
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    if (value.length < 3 || value.length > 10) {
      setError("Username must be between 3 and 10 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate username format
    if (!isLogin && !validateUsername(username)) {
      setLoading(false);
      return;
    }

    // Validate password confirmation for registration
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const body = { username, password };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to home page
        navigate("/");
        window.location.reload(); // Force reload to update auth context
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Memory Game</h1>
          <h2 className="auth-subtitle">{isLogin ? "Login" : "Register"}</h2>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
                minLength={3}
                maxLength={10}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter your password"
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {error && <div className="error">{error}</div>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
            </button>
          </form>

          <div className="auth-toggle">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setConfirmPassword("");
              }}
              className="toggle-button"
            >
              {isLogin ? "Register" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
