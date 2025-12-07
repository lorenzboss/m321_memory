import { Link } from "react-router-dom";
import "./NotFoundGamePage.css";

export default function NotFoundGamePage() {
  return (
    <div className="not-found-game-container">
      <div className="not-found-game-content">
        <img
          src="/pikachu.gif"
          alt="Pikachu"
          className="not-found-game-image"
        />
        <h2 className="not-found-game-subtitle">Game Not Found</h2>
        <p className="not-found-game-message">
          The game PIN you entered doesn't exist or the game has already ended.
          Please check the PIN and try again.
        </p>
        <Link to="/" className="not-found-game-home-link">
          Back to Homepage
        </Link>
      </div>
    </div>
  );
}
