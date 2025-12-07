import { Server, Socket } from 'socket.io';
import { GameManager } from '../services/GameManager';
import { Player } from '../types/game';

export class SocketHandler {
  private gameManager: GameManager;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.gameManager = new GameManager();

    // Cleanup alte Spiele alle 5 Minuten
    setInterval(
      () => {
        this.gameManager.cleanupOldGames();
      },
      5 * 60 * 1000,
    );
  }

  handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}`);

    // Vereinfachte Authentifizierung mit Benutzerdaten
    socket.on('authenticate', (userData: { uuid: string; name: string; email: string }) => {
      try {
        if (!userData || !userData.uuid || !userData.name || !userData.email) {
          socket.emit('authenticated', { success: false, error: 'Invalid user data' });
          socket.disconnect();
          return;
        }

        const player: Player = {
          id: userData.uuid,
          name: userData.name,
          email: userData.email,
          socketId: socket.id,
          isReady: true,
        };

        socket.data.player = player;
        socket.emit('authenticated', { success: true });
        console.log(`Player authenticated: ${player.name} (${player.id})`);
      } catch (error) {
        console.error('Socket authentication failed:', error);
        socket.emit('authenticated', { success: false, error: 'Authentication failed' });
        socket.disconnect();
      }
    });

    // Spiel erstellen
    socket.on('create-game', () => {
      const player = socket.data.player as Player;
      if (!player) {
        socket.emit('game-error', 'Not authenticated');
        return;
      }

      try {
        const gameId = this.gameManager.createGame(player);
        socket.join(gameId);
        socket.emit('game-created', gameId);

        const gameState = this.gameManager.getGameState(gameId, player.id);
        if (gameState) {
          socket.emit('game-state-updated', gameState);
        }
      } catch (error) {
        console.error('Error creating game:', error);
        socket.emit('game-error', 'Failed to create game');
      }
    });

    // Spiel beitreten
    socket.on('join-game', (gameId: string) => {
      const player = socket.data.player as Player;
      if (!player) {
        console.log('Join game failed: Player not authenticated');
        socket.emit('game-error', 'Not authenticated');
        return;
      }

      console.log(`Player ${player.name} trying to join game ${gameId}`);

      try {
        const success = this.gameManager.joinGame(gameId, player);

        if (success) {
          console.log(`Player ${player.name} successfully joined game ${gameId}`);
          socket.join(gameId);
          socket.emit('game-joined', gameId);

          // Benachrichtige alle Spieler im Spiel über den neuen Spieler
          socket.to(gameId).emit('player-joined', player);

          // Sende aktuellen Spielstatus an alle mit der korrigierten Methode
          this.broadcastGameUpdate(gameId);
        } else {
          const game = this.gameManager.getGame(gameId);
          console.log(
            `Join failed for game ${gameId}. Game exists: ${!!game}, Status: ${game?.status}, Players: ${game?.players.length}`,
          );

          if (!game) {
            socket.emit('game-error', 'Game not found - please check the game PIN');
          } else if (game.players.length >= 2) {
            socket.emit('game-error', 'Game is full - maximum 2 players allowed');
          } else if (game.status !== 'waiting') {
            socket.emit('game-error', 'Game has already started or finished');
          } else {
            socket.emit('game-error', 'Cannot join game');
          }
        }
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('game-error', 'Failed to join game');
      }
    });

    // Karte umdrehen
    socket.on('flip-card', (cardId: string) => {
      const player = socket.data.player as Player;
      if (!player) {
        socket.emit('game-error', 'Not authenticated');
        return;
      }

      try {
        // Finde das Spiel des Spielers
        const gameId = this.findPlayerGame(player.id);
        if (!gameId) {
          socket.emit('game-error', 'Not in a game');
          return;
        }

        const gameState = this.gameManager.flipCard(gameId, player.id, cardId);

        if (gameState) {
          // Sofortiges Update für alle Spieler
          this.broadcastGameUpdate(gameId);

          // Wenn 2 Karten umgedreht sind, prüfe Match nach Delay
          const game = this.gameManager.getGame(gameId);
          if (game && game.flippedCards.length === 2) {
            this.gameManager.triggerMatchCheck(gameId, this);
          }
        } else {
          socket.emit('game-error', 'Invalid move');
        }
      } catch (error) {
        console.error('Error flipping card:', error);
        socket.emit('game-error', 'Failed to flip card');
      }
    });

    // Spiel verlassen
    socket.on('leave-game', () => {
      this.handlePlayerLeave(socket);
    });

    // Verbindung getrennt
    socket.on('disconnect', () => {
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
        // Benachrichtige andere Spieler
        socket.to(gameId).emit('player-left', player.id);

        // Update Spielstatus für verbleibende Spieler
        const game = this.gameManager.getGame(gameId);
        if (game) {
          game.players.forEach((p) => {
            const gameState = this.gameManager.getGameState(gameId, p.id);
            if (gameState) {
              this.io.to(gameId).emit('game-state-updated', gameState);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error handling player leave:', error);
    }
  }

  private findPlayerGame(playerId: string): string | null {
    return this.gameManager.getPlayerGameId(playerId);
  }

  // Methode für das Broadcasten von Game-Updates
  public broadcastGameUpdate(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    // Sende jedem Spieler seinen individuellen GameState
    game.players.forEach((p) => {
      const playerGameState = this.gameManager.getGameState(gameId, p.id);
      if (playerGameState) {
        // Finde den Socket dieses Spielers und sende ihm seinen spezifischen State
        const playerSockets = Array.from(this.io.sockets.sockets.values()).filter(
          (socket) => socket.data.player?.id === p.id,
        );

        playerSockets.forEach((socket) => {
          socket.emit('game-state-updated', playerGameState);
        });
      }
    });

    // Wenn das Spiel beendet ist, sende das Ende-Event
    if (game.status === 'finished') {
      const scores = game.scores;
      const winner = game.players.reduce((prev, current) =>
        scores[prev.id] > scores[current.id] ? prev : current,
      );
      this.io.to(gameId).emit('game-finished', winner, scores);
    }
  }
}
