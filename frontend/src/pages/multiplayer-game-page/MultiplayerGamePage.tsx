import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../../components/card/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import "./MultiplayerGamePage.css";

interface Player {
  id: string;
  name: string;
  email?: string;
  socketId: string;
  isReady: boolean;
}

interface GameCard {
  id: string;
  pokemonName: string;
  pokemonImg: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy?: string;
}

interface Game {
  id: string;
  players: Player[];
  cards: GameCard[];
  currentPlayerIndex: number;
  status: "waiting" | "playing" | "finished";
  flippedCards: string[];
  scores: { [playerId: string]: number };
  createdAt: string;
  lastActivity: string;
  isProcessingMatch?: boolean;
  playerFinishTimes?: { [playerId: string]: string };
  playerTotalTime?: { [playerId: string]: number };
  currentTurnStartTime?: string;
}

interface GameState {
  game: Game;
  currentPlayer: Player;
  isYourTurn: boolean;
  message?: string;
}

export default function MultiplayerGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(true);
  const [timers, setTimers] = useState<{ [playerId: string]: number }>({});

  const socket = useSocket();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/");
      return;
    }

    // Überprüfe ob gameId gültig ist
    if (!gameId || gameId.trim() === "") {
      navigate("/game-not-found");
      return;
    }

    if (!socket) {
      setError("Unable to connect to game server");
      return;
    }

    socket.off("authenticated");
    socket.off("game-joined");
    socket.off("game-state-updated");
    socket.off("player-joined");
    socket.off("player-left");
    socket.off("game-finished");
    socket.off("game-error");

    socket.once(
      "authenticated",
      (data: { success: boolean; error?: string }) => {
        if (data.success) {
          setIsConnecting(false);
          if (gameId) socket.emit("join-game", gameId);
        } else {
          setError(data.error || "Authentication failed");
          setIsConnecting(false);
        }
      },
    );

    socket.on("game-joined", () => setError(""));
    socket.on("game-state-updated", (newGameState: GameState) =>
      setGameState(newGameState),
    );
    socket.on("player-joined", () => {});
    socket.on("player-left", () => {});
    socket.on("game-finished", () => {});
    socket.on("game-error", (errorMessage: string) => {
      // Überprüfe ob es sich um einen "Game not found" Fehler handelt
      if (
        errorMessage.includes("Game not found") ||
        errorMessage.includes("not found")
      ) {
        navigate("/game-not-found");
      } else {
        setError(errorMessage);
      }
    });

    socket.emit("authenticate", {
      uuid: user.uuid,
      name: user.name,
      email: user.email,
    });

    return () => {
      socket.off("authenticated");
      socket.off("game-joined");
      socket.off("game-state-updated");
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("game-finished");
      socket.off("game-error");
    };
  }, [socket, isAuthenticated, user, gameId, navigate]);

  const handleCardClick = (cardId: string) => {
    if (!socket || !gameState || !gameState.isYourTurn) return;

    const card = gameState.game.cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    socket.emit("flip-card", cardId);
  };

  const handleLeaveGame = () => {
    if (socket) socket.emit("leave-game");
    navigate("/");
  };

  // Timer-Update – nutzt serverseitige total time + aktuelle Zugzeit
  useEffect(() => {
    if (!gameState || gameState.game.status !== "playing") return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const newTimers: { [playerId: string]: number } = {};

      gameState.game.players.forEach((player) => {
        const totalTime = gameState.game.playerTotalTime?.[player.id] || 0;

        if (
          gameState.game.currentPlayerIndex ===
            gameState.game.players.indexOf(player) &&
          gameState.game.currentTurnStartTime
        ) {
          const currentTurnStart = new Date(
            gameState.game.currentTurnStartTime,
          ).getTime();
          const currentTurnTime = now - currentTurnStart;
          newTimers[player.id] = Math.floor(
            (totalTime + currentTurnTime) / 1000,
          );
        } else {
          newTimers[player.id] = Math.floor(totalTime / 1000);
        }
      });

      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const initials = (name?: string) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  if (!isAuthenticated) {
    return (
      <div className="multiplayer-game-container">
        <div className="error-message">Please sign in to play the game.</div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="multiplayer-game-container">
        <div className="status-message">Connecting to game server...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="multiplayer-game-container">
        <div className="error-container glass">
          <div className="error-content">
            <h2 className="error-title">Unable to Join Game</h2>
            <p className="error-message">{error}</p>
            <button
              className="control-button leave-button"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="multiplayer-game-container">
        <div className="status-message">Loading game...</div>
      </div>
    );
  }

  const { game } = gameState;
  const me = game.players.find((p) => p.id === user?.uuid);
  const opp = game.players.find((p) => p.id !== user?.uuid);

  const twoPlayersReady = game.players.length >= 2;
  const waiting = game.status === "waiting" || !twoPlayersReady;

  const isTurn = (player?: Player) =>
    !!player && game.players[game.currentPlayerIndex]?.id === player.id;

  return (
    <div className="multiplayer-game-container">
      <div className="game-layout">
        {/* Sidebar (links) */}
        <aside className="sidebar glass">
          <div className="sidebar-inner">
            {/* Game Code – jetzt volle Breite */}
            <div className="game-pin-wrap">
              <label className="game-pin-label">Game Code</label>
              <div className="game-pin-box">{game.id}</div>
            </div>

            {/* Spieler */}
            <div className="sidebar-players">
              {/* Me */}
              <div className={`player-card ${isTurn(me) ? "is-turn" : ""}`}>
                <div className="player-avatar">{initials(me?.name)}</div>
                <div className="player-name" title={me?.name || "You"}>
                  {me?.name || "You"}
                </div>

                <div className="score-row">
                  <span className="score-label">Score</span>
                  <span className="score-pill">
                    {me ? game.scores[me.id] || 0 : 0}
                  </span>
                </div>

                <div className="player-timer">
                  Time:&nbsp;{me ? formatTime(timers[me.id] || 0) : "0:00"}
                </div>

                {isTurn(me) && <div className="turn-tag">Your turn</div>}
              </div>

              {/* Opponent */}
              <div className={`player-card ${isTurn(opp) ? "is-turn" : ""}`}>
                <div className="player-avatar">{initials(opp?.name)}</div>
                <div className="player-name" title={opp?.name || "Opponent"}>
                  {opp?.name || "Opponent"}
                </div>

                <div className="score-row">
                  <span className="score-label">Score</span>
                  <span className="score-pill">
                    {opp ? game.scores[opp.id] || 0 : 0}
                  </span>
                </div>

                <div className="player-timer">
                  Time:&nbsp;{opp ? formatTime(timers[opp.id] || 0) : "0:00"}
                </div>

                {isTurn(opp) && <div className="turn-tag">Their turn</div>}
              </div>
            </div>

            {/* Status / Finish */}
            {game.status === "finished" ? (
              <div
                className={`game-result ${
                  gameState.message?.includes("You won") ? "winner" : "loser"
                }`}
              >
                <span className="result-row">
                  <span className="result-icon" aria-hidden>
                    {gameState.message?.includes("You won") ? "🏆" : "💥"}
                  </span>
                  <span>{gameState.message}</span>
                </span>
                <span className="result-sub">
                  {gameState.message?.includes("You won")
                    ? "GG! That was good!"
                    : "Tough one. Rematch?"}
                </span>
              </div>
            ) : (
              <div
                className={`turn-indicator ${waiting ? "waiting" : ""}`}
                aria-live="polite"
              >
                {waiting ? (
                  <>
                    Waiting for opponent…
                    <span className="dots" aria-hidden="true">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </>
                ) : (
                  gameState.message
                )}
              </div>
            )}

            {/* Leave */}
            <div className="sidebar-controls">
              <button
                className="control-button leave-button"
                onClick={handleLeaveGame}
              >
                Leave Game
              </button>
            </div>
          </div>
        </aside>

        {/* Board (rechts, zentriert) */}
        <main className="board-col glass">
          <div className="board-panel">
            {twoPlayersReady && !waiting ? (
              <div className="board-center">
                <div className="cards-container">
                  {game.cards.map((card) => (
                    <div key={card.id} className="card-wrap">
                      <Card
                        id={card.id}
                        imageUrl={card.pokemonImg}
                        altText={card.pokemonName}
                        isFlipped={card.isFlipped}
                        isMatched={card.isMatched}
                        isClickable={
                          gameState.isYourTurn &&
                          !card.isFlipped &&
                          !card.isMatched &&
                          !game.isProcessingMatch
                        }
                        onClick={() => handleCardClick(card.id)}
                        matchedBy={card.matchedBy}
                        currentUserId={user?.uuid}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="board-center">
                <p className="placeholder-text">
                  Waiting for opponent to join to start the board…
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
