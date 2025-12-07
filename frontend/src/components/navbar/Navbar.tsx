import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Navbar.css";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

export default function Navbar() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <div>
            <Link to="/" className="navbar-title-link">
              <h1>Memoriq</h1>
            </Link>
          </div>
          <div className="navbar-button-container">
            <span>Loading...</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div>
          <Link to="/" className="navbar-title-link">
            <h1>Memoriq</h1>
          </Link>
        </div>
        <div className="navbar-button-container">
          {!isAuthenticated ? (
            <button className="navbar-button" onClick={() => navigate("/auth")}>
              Sign In
            </button>
          ) : (
            <>
              <span className="navbar-user">Hello, {user?.username}!</span>
              <button className="navbar-button" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
