import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, isLoading } = useAuth();

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
            <button
              className="navbar-button"
              onClick={() =>
                (window.location.href =
                  process.env.REACT_APP_AUTH_SERVICE_URL ||
                  "http://localhost:8002")
              }
            >
              Sign In
            </button>
          ) : (
            <>
              <button
                className="navbar-button"
                onClick={() =>
                  (window.location.href = `${process.env.REACT_APP_AUTH_SERVICE_URL || "http://localhost:8002"}/#/manage`)
                }
              >
                Manage Account
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
