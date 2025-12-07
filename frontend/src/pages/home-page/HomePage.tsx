import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Leaderboard from "../../components/leaderboard/leaderboard";
import StatsCard from "../../components/stats-card/StatsCard";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { fetchLeaderboard, fetchUserStats } from "../../services/statsService";
import { LeaderboardEntry, UserStats } from "../../types/stats";
import "./HomePage.css";

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState("");
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState<string | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[]
  >([]);

  const socket = useSocket();
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUserStats(null);
      setLeaderboardEntries([]);
      setIsStatsLoading(false);
      setIsLeaderboardLoading(false);
      return;
    }

    let cancelled = false;
    const statsController = new AbortController();
    const leaderboardController = new AbortController();

    const loadStats = async () => {
      setIsStatsLoading(true);
      setStatsError(null);

      try {
        const payload = await fetchUserStats(user.username, {
          signal: statsController.signal,
        });

        if (cancelled) {
          return;
        }

        setUserStats(payload);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        console.error("Failed to load user stats", fetchError);
        if (!cancelled) {
          setStatsError("Unable to load your stats right now.");
          setUserStats(null);
        }
      } finally {
        if (!cancelled) {
          setIsStatsLoading(false);
        }
      }
    };

    const loadLeaderboard = async () => {
      setIsLeaderboardLoading(true);
      setLeaderboardError(null);
      try {
        const payload = await fetchLeaderboard({
          signal: leaderboardController.signal,
        });

        if (cancelled) {
          return;
        }

        setLeaderboardEntries(payload);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        console.error("Failed to load leaderboard", fetchError);
        if (!cancelled) {
          setLeaderboardError("Unable to load the leaderboard right now.");
          setLeaderboardEntries([]);
        }
      } finally {
        if (!cancelled) {
          setIsLeaderboardLoading(false);
        }
      }
    };

    loadStats();
    loadLeaderboard();

    return () => {
      cancelled = true;
      statsController.abort();
      leaderboardController.abort();
    };
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="home-container">
        <div className="ambient" />
        <div className="shell">
          <h2 className="headline shimmer">Loading…</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="home-container">
        <div className="ambient" />
        <div className="shell">
          <h2 className="headline">Please log in to continue</h2>
          <p className="subtle">You need an account to use multiplayer.</p>
        </div>
      </div>
    );
  }

  const handleCreateGame = async () => {
    if (!socket) {
      setError("Unable to connect to game server");
      return;
    }

    if (!user) {
      setError("User information not available. Please sign in again.");
      return;
    }

    setIsCreatingGame(true);
    setError("");

    socket.off("authenticated");
    socket.off("game-created");
    socket.off("game-error");

    socket.once(
      "authenticated",
      (data: { success: boolean; error?: string }) => {
        if (data.success) {
          socket.emit("create-game");
        } else {
          setError(data.error || "Authentication failed");
          setIsCreatingGame(false);
        }
      }
    );

    socket.once("game-created", (gameId: string) => {
      setIsCreatingGame(false);
      navigate(`/multiplayer/${gameId}`);
    });

    socket.once("game-error", (errorMessage: string) => {
      setError(errorMessage);
      setIsCreatingGame(false);
    });

    socket.emit("authenticate", {
      uuid: user.id.toString(),
      name: user.username,
    });
  };

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      setError("Please enter a game code");
      return;
    }
    if (!socket) {
      setError("Unable to connect to game server");
      return;
    }

    setIsJoiningGame(true);
    setError("");

    try {
      navigate(`/multiplayer/${gameCode.trim().toUpperCase()}`);
    } catch (error) {
      console.error("Error joining game:", error);
      setError("Error joining game. Please check the game code and try again.");
    } finally {
      setIsJoiningGame(false);
      setGameCode("");
    }
  };

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="home-container">
        <div className="ambient" />
        <div className="cards-row">
          <div
            className="main-card-col"
            style={{ maxWidth: "600px", margin: "0 auto" }}
          >
            <div
              className="welcome-section glass glow"
              style={{ textAlign: "center", padding: "3rem" }}
            >
              <h2 className="headline">Welcome to Memoriq!</h2>
              <p
                style={{
                  fontSize: "1.1rem",
                  margin: "1.5rem 0",
                  color: "#666",
                }}
              >
                Please sign in or create an account to start playing
              </p>
              <button
                className="game-button btn-primary"
                onClick={() => navigate("/auth")}
                style={{
                  fontSize: "1.2rem",
                  padding: "1rem 2rem",
                  marginTop: "1rem",
                }}
              >
                Sign In / Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="ambient" />
      <div className="cards-row">
        <div className="stats-card-col">
          <StatsCard stats={userStats} isLoading={isStatsLoading} />
          {statsError && (
            <div className="error-message glow error-glow" role="alert">
              {statsError}
            </div>
          )}
        </div>
        <div className="main-card-col">
          {/* The middle section remains exactly as before! */}
          <div className="welcome-section glass glow">
            <h2 className="headline">
              Welcome back,{" "}
              <span className="gradient-text">{user?.username}</span>!
            </h2>
          </div>
          {error && (
            <div className="error-message glow error-glow">{error}</div>
          )}
          <div className="game-actions glass glow">
            <h3 className="section-title">Start Playing</h3>
            <div className="grid">
              {/* Create */}
              <div className="pane">
                <h4 className="pane-title">Create New Multiplayer Game</h4>
                <button
                  className="game-button btn-primary"
                  onClick={handleCreateGame}
                  disabled={isCreatingGame}
                >
                  {isCreatingGame ? "Creating…" : "Create Multiplayer Game"}
                </button>
                <p className="hint">Instant lobby • Share the 4-digit code</p>
              </div>
              {/* Join */}
              <div className="pane">
                <h4 className="pane-title">Join Existing Multiplayer Game</h4>
                <div className="join-game-container">
                  <div
                    className={`code-input-wrap ${gameCode.length === 4 ? "ok" : ""}`}
                  >
                    <input
                      type="text"
                      className="game-code-input"
                      placeholder="0000"
                      value={gameCode}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4);
                        setGameCode(value);
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        gameCode.length === 4 &&
                        handleJoinGame()
                      }
                      disabled={isJoiningGame}
                      maxLength={4}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-label="Enter 4 digit game code"
                    />
                    <span className="code-dots" aria-hidden="true">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < gameCode.length ? "filled" : ""}
                        />
                      ))}
                    </span>
                  </div>
                  <button
                    className="game-button btn-accent"
                    onClick={handleJoinGame}
                    disabled={isJoiningGame || gameCode.length !== 4}
                  >
                    {isJoiningGame ? "Joining…" : "Join Multiplayer Game"}
                  </button>
                </div>
                <p className="hint">Type the 4 digits • Press Enter to join</p>
              </div>
            </div>
            <div className="divider" />
            <div className="single-player-section">
              <h4 className="pane-title">Single Player Practice</h4>
              <button
                className="game-button btn-muted"
                onClick={() => navigate("/practice")}
              >
                Play Solo (Practice Mode)
              </button>
            </div>
          </div>
        </div>
        <div className="leaderboard-card-col">
          <Leaderboard
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
          />
          {leaderboardError && (
            <div className="error-message glow error-glow" role="alert">
              {leaderboardError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
