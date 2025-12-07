import { Server, Socket } from "socket.io";
import { GameManager } from "../services/GameManager";
import { Player } from "../types";

export class SocketHandler {
  private gameManager: GameManager;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.gameManager = new GameManager();

    setInterval(
      () => {
        this.gameManager.cleanupOldGames();
      },
      5 * 60 * 1000
    );
  }

  handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}`);

    socket.on("authenticate", (userData: { uuid: string; name: string }) => {
      try {
        if (!userData || !userData.uuid || !userData.name) {
          socket.emit("authenticated", {
            success: false,
            error: "Invalid user data",
          });
          socket.disconnect();
          return;
        }

        const player: Player = {
          id: userData.uuid,
          name: userData.name,
          socketId: socket.id,
          isReady: true,
        };

        socket.data.player = player;
        socket.emit("authenticated", { success: true });
        console.log(`Player authenticated: ${player.name} (${player.id})`);
      } catch (error) {
        console.error("Socket authentication failed:", error);
        socket.emit("authenticated", {
          success: false,
          error: "Authentication failed",
        });
        socket.disconnect();
      }
    });

    socket.on("create-game", () => {
      const player = socket.data.player as Player;
      if (!player) {
        socket.emit("game-error", "Not authenticated");
        return;
      }

      try {
        const gameId = this.gameManager.createGame(player);
        socket.join(gameId);
        socket.emit("game-created", gameId);

        const gameState = this.gameManager.getGameState(gameId, player.id);
        if (gameState) {
          socket.emit("game-state-updated", gameState);
        }
      } catch (error) {
        console.error("Error creating game:", error);
        socket.emit("game-error", "Failed to create game");
      }
    });

    socket.on("join-game", (gameId: string) => {
      const player = socket.data.player as Player;
      if (!player) {
        socket.emit("game-error", "Not authenticated");
        return;
      }

      try {
        const success = this.gameManager.joinGame(gameId, player);
        console.log(
          `Player ${player.name} (${player.id}) attempting to join game ${gameId}: ${success}`
        );

        if (success) {
          socket.join(gameId);
          socket.emit("game-joined", gameId);
          socket.to(gameId).emit("player-joined", player);
          console.log(`Broadcasting game update for game ${gameId}`);
          this.broadcastGameUpdate(gameId);
        } else {
          const game = this.gameManager.getGame(gameId);
          if (!game) {
            socket.emit(
              "game-error",
              "Game not found - please check the game PIN"
            );
          } else if (game.players.length >= 2) {
            socket.emit(
              "game-error",
              "Game is full - maximum 2 players allowed"
            );
          } else if (game.status !== "waiting") {
            socket.emit("game-error", "Game has already started or finished");
          } else {
            socket.emit("game-error", "Cannot join game");
          }
        }
      } catch (error) {
        console.error("Error joining game:", error);
        socket.emit("game-error", "Failed to join game");
      }
    });

    socket.on("flip-card", (cardId: string) => {
      const player = socket.data.player as Player;
      if (!player) {
        socket.emit("game-error", "Not authenticated");
        return;
      }

      try {
        const gameId = this.findPlayerGame(player.id);
        if (!gameId) {
          socket.emit("game-error", "Not in a game");
          return;
        }

        const gameState = this.gameManager.flipCard(gameId, player.id, cardId);

        if (gameState) {
          this.broadcastGameUpdate(gameId);

          const game = this.gameManager.getGame(gameId);
          if (game && game.flippedCards.length === 2) {
            this.gameManager.triggerMatchCheck(gameId, this);
          }
        }
        // Silent fail if flipCard returns null (e.g., during match processing)
        // This is expected when players click too fast
      } catch (error) {
        console.error("Error flipping card:", error);
        socket.emit("game-error", "Failed to flip card");
      }
    });

    socket.on("leave-game", () => {
      this.handlePlayerLeave(socket);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      this.handlePlayerLeave(socket);
    });
  }

  private handlePlayerLeave(socket: Socket): void {
    const player = socket.data.player as Player;
    if (!player) return;

    try {
      const gameId = this.gameManager.leaveGame(player.id);

      if (gameId) {
        socket.leave(gameId);
        socket.to(gameId).emit("player-left", player.id);

        const game = this.gameManager.getGame(gameId);
        if (game) {
          game.players.forEach((p) => {
            const gameState = this.gameManager.getGameState(gameId, p.id);
            if (gameState) {
              this.io.to(gameId).emit("game-state-updated", gameState);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error handling player leave:", error);
    }
  }

  private findPlayerGame(playerId: string): string | null {
    return this.gameManager.getPlayerGameId(playerId);
  }

  public broadcastGameUpdate(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    console.log(
      `Broadcasting update for game ${gameId}, status: ${game.status}, players: ${game.players.length}`
    );

    game.players.forEach((p) => {
      const playerGameState = this.gameManager.getGameState(gameId, p.id);
      if (playerGameState) {
        const playerSockets = Array.from(
          this.io.sockets.sockets.values()
        ).filter((socket) => socket.data.player?.id === p.id);

        console.log(
          `Sending game state to player ${p.name} (${p.id}), found ${playerSockets.length} socket(s), game status: ${playerGameState.game.status}`
        );

        playerSockets.forEach((socket) => {
          socket.emit("game-state-updated", playerGameState);
        });
      }
    });

    if (game.status === "finished") {
      const scores = game.scores;
      const winner = game.players.reduce((prev, current) =>
        scores[prev.id] > scores[current.id] ? prev : current
      );
      this.io.to(gameId).emit("game-finished", winner, scores);
    }
  }
}
