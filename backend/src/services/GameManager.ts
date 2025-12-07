import { pokemons } from "../pokemons";
import { Card, Game, GameState, Player } from "../types";
import { statsService } from "./StatsService";

export class GameManager {
  private games: Map<string, Game> = new Map();
  private playerGameMap: Map<string, string> = new Map();

  createGame(player: Player): string {
    const gameId = this.generateGameId();
    const cards = this.generateCards();

    const game: Game = {
      id: gameId,
      players: [player],
      cards,
      currentPlayerIndex: 0,
      status: "waiting",
      flippedCards: [],
      scores: { [player.id]: 0 },
      createdAt: new Date(),
      lastActivity: new Date(),
      playerFinishTimes: {},
      playerTotalTime: {},
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(player.id, gameId);

    console.log(`Game ${gameId} created by ${player.name}`);
    return gameId;
  }

  joinGame(gameId: string, player: Player): boolean {
    const game = this.games.get(gameId);

    if (!game) return false;
    if (game.players.length >= 2) return false;
    if (game.status !== "waiting") return false;

    const existingPlayer = game.players.find((p) => p.id === player.id);
    if (existingPlayer) {
      console.log(
        `Player ${player.name} (${player.id}) is already in game ${gameId}`
      );
      return true;
    }

    game.players.push(player);
    game.scores[player.id] = 0;
    this.playerGameMap.set(player.id, gameId);
    console.log(
      `Player ${player.name} (${player.id}) joined game ${gameId}. Players now: ${game.players.length}`
    );

    if (game.players.length === 2) {
      this.startGame(gameId);
    }

    game.lastActivity = new Date();
    return true;
  }

  private startGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.status = "playing";
    game.startTime = new Date();

    if (!game.playerTotalTime) game.playerTotalTime = {};
    game.players.forEach((player) => {
      game.playerTotalTime![player.id] = 0;
    });

    game.currentPlayerIndex = Math.floor(Math.random() * 2);
    game.currentTurnStartTime = new Date();
    game.lastActivity = new Date();

    console.log(
      `Game ${gameId} started with players: ${game.players.map((p) => p.name).join(", ")}`
    );

    // Print solution for debugging
    this.printGameSolution(game);
  }

  flipCard(gameId: string, playerId: string, cardId: string): GameState | null {
    const game = this.games.get(gameId);

    if (!game || game.status !== "playing") {
      return null;
    }

    // Prevent flipping cards while processing a match
    if (game.isProcessingMatch) {
      return null;
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return null;
    }

    const card = game.cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) {
      return null;
    }

    card.isFlipped = true;
    game.flippedCards.push(cardId);
    game.lastActivity = new Date();

    // Set processing flag when two cards are flipped
    if (game.flippedCards.length === 2) {
      game.isProcessingMatch = true;
    }

    return this.getGameState(gameId, playerId);
  }

  private updateCurrentPlayerTime(game: Game): void {
    if (!game.currentTurnStartTime || !game.playerTotalTime) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    const turnDuration = Date.now() - game.currentTurnStartTime.getTime();

    game.playerTotalTime[currentPlayer.id] =
      (game.playerTotalTime[currentPlayer.id] || 0) + turnDuration;
  }

  private checkMatch(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game || game.flippedCards.length !== 2) return;

    this.updateCurrentPlayerTime(game);

    const [cardId1, cardId2] = game.flippedCards;
    const card1 = game.cards.find((c) => c.id === cardId1);
    const card2 = game.cards.find((c) => c.id === cardId2);

    if (!card1 || !card2) return;

    const isMatch = card1.pokemonId === card2.pokemonId;
    const currentPlayer = game.players[game.currentPlayerIndex];

    if (isMatch) {
      card1.isMatched = true;
      card2.isMatched = true;
      card1.matchedBy = currentPlayer.id;
      card2.matchedBy = currentPlayer.id;
      game.scores[currentPlayer.id]++;

      if (!game.playerFinishTimes) game.playerFinishTimes = {};
      game.playerFinishTimes[currentPlayer.id] = new Date();
      game.currentTurnStartTime = new Date();
    } else {
      card1.isFlipped = false;
      card2.isFlipped = false;
      game.currentPlayerIndex =
        (game.currentPlayerIndex + 1) % game.players.length;
      game.currentTurnStartTime = new Date();
    }

    game.flippedCards = [];
    game.isProcessingMatch = false; // Clear the processing flag

    const allMatched = game.cards.every((card) => card.isMatched);
    if (allMatched) {
      this.endGame(game);
    }

    game.lastActivity = new Date();
  }

  private async endGame(game: Game): Promise<void> {
    this.updateCurrentPlayerTime(game);

    game.status = "finished";
    game.endTime = new Date();

    const winner = this.determineWinner(game);
    const gameDuration =
      game.startTime && game.endTime
        ? Math.round((game.endTime.getTime() - game.startTime.getTime()) / 1000)
        : 0;

    // Save stats for all players
    for (const player of game.players) {
      const playerTime = game.playerTotalTime?.[player.id] || 0;
      const score = game.scores[player.id] || 0;

      await statsService.upsertUserStatsForMatch({
        username: player.name,
        score: score,
        matchDuration: Math.round(playerTime / 1000),
        isWinner: player.id === winner,
      });
    }

    console.log(
      `Game ${game.id} ended. Winner: ${game.players.find((p) => p.id === winner)?.name}. Duration: ${gameDuration}s`
    );
  }

  public triggerMatchCheck(
    gameId: string,
    socketHandler: { broadcastGameUpdate: (gameId: string) => void }
  ): void {
    setTimeout(() => {
      this.checkMatch(gameId);
      const game = this.getGame(gameId);
      if (game && socketHandler) {
        socketHandler.broadcastGameUpdate(gameId);
      }
    }, 800);
  }

  leaveGame(playerId: string): string | null {
    const gameId = this.playerGameMap.get(playerId);
    if (!gameId) return null;

    const game = this.games.get(gameId);
    if (!game) return null;

    game.players = game.players.filter((p) => p.id !== playerId);
    delete game.scores[playerId];
    this.playerGameMap.delete(playerId);

    if (game.players.length === 0) {
      this.games.delete(gameId);
    } else {
      game.status = "finished";
    }

    return gameId;
  }

  getGameState(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return null;

    const currentPlayer = game.players[game.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === playerId;

    // Determine message based on game status
    let message: string | undefined;
    if (game.status === "finished") {
      const winnerId = this.determineWinner(game);
      const winner = game.players.find((p) => p.id === winnerId);
      if (winner) {
        message =
          winnerId === playerId
            ? `You won! Score: ${game.scores[playerId]}`
            : `${winner.name} won! Score: ${game.scores[winnerId]}`;
      }
    } else if (game.status === "playing" && currentPlayer) {
      // Show whose turn it is during the game
      message = isMyTurn ? "Your turn" : `${currentPlayer.name}'s turn`;
    }

    return {
      game: {
        id: game.id,
        players: game.players,
        cards: game.cards.map((card) => ({
          id: card.id,
          pokemonId: card.pokemonId,
          pokemonName: pokemons[card.pokemonId - 1]?.name || "Unknown",
          pokemonImg: pokemons[card.pokemonId - 1]?.img || "",
          isFlipped: card.isFlipped,
          isMatched: card.isMatched,
          matchedBy: card.matchedBy,
        })),
        currentPlayerIndex: game.currentPlayerIndex,
        status: game.status,
        flippedCards: game.flippedCards,
        scores: game.scores,
        createdAt: game.createdAt.toISOString(),
        lastActivity: game.lastActivity.toISOString(),
        playerFinishTimes: game.playerFinishTimes
          ? Object.fromEntries(
              Object.entries(game.playerFinishTimes).map(([k, v]) => [
                k,
                v.toISOString(),
              ])
            )
          : {},
        playerTotalTime: game.playerTotalTime || {},
        currentTurnStartTime: game.currentTurnStartTime?.toISOString(),
        isProcessingMatch: game.isProcessingMatch || false,
      },
      currentPlayer: currentPlayer || game.players[0],
      isYourTurn: isMyTurn,
      message,
    };
  }

  getGame(gameId: string): Game | null {
    return this.games.get(gameId) || null;
  }

  getPlayerGameId(playerId: string): string | null {
    return this.playerGameMap.get(playerId) || null;
  }

  private generateCards(): Card[] {
    const shuffledPokemons = [...pokemons].sort(() => Math.random() - 0.5);
    const selectedPokemons = shuffledPokemons.slice(0, 8);

    const cards: Card[] = [];
    selectedPokemons.forEach((pokemon, index) => {
      cards.push({
        id: `${index}-1`,
        pokemonId: index,
        isFlipped: false,
        isMatched: false,
      });
      cards.push({
        id: `${index}-2`,
        pokemonId: index,
        isFlipped: false,
        isMatched: false,
      });
    });

    return cards.sort(() => Math.random() - 0.5);
  }

  private determineWinner(game: Game): string {
    const players = game.players;
    const scores = game.scores;

    const sortedByScore = [...players].sort((a, b) => {
      const scoreA = scores[a.id] || 0;
      const scoreB = scores[b.id] || 0;
      return scoreB - scoreA;
    });

    const player1 = sortedByScore[0];
    const player2 = sortedByScore[1];
    const score1 = scores[player1.id] || 0;
    const score2 = scores[player2?.id] || 0;

    if (score1 !== score2) {
      return player1.id;
    }

    if (game.playerTotalTime && player2) {
      const time1 = game.playerTotalTime[player1.id] || 0;
      const time2 = game.playerTotalTime[player2.id] || 0;

      if (time1 < time2) return player1.id;
      if (time2 < time1) return player2.id;
    }

    return player1.id;
  }

  private generateGameId(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private printGameSolution(game: Game): void {
    console.log(`\n🎮 Game ${game.id} - Solution (for debugging):`);
    console.log("=".repeat(30));

    // Map pokemonId to a sequential pair number (1-8) based on first appearance
    const pokemonToPairNumber = new Map<number, number>();
    let nextPairNumber = 1;

    // Create 4x4 grid showing pair numbers (1-8)
    const grid: string[][] = [];
    for (let i = 0; i < 4; i++) {
      const row: string[] = [];
      for (let j = 0; j < 4; j++) {
        const cardIndex = i * 4 + j;
        const card = game.cards[cardIndex];

        // Assign pair number on first encounter
        if (!pokemonToPairNumber.has(card.pokemonId)) {
          pokemonToPairNumber.set(card.pokemonId, nextPairNumber);
          nextPairNumber++;
        }

        row.push(pokemonToPairNumber.get(card.pokemonId)!.toString());
      }
      grid.push(row);
    }

    // Print the grid
    grid.forEach((row) => {
      console.log(`  ${row.join("  ")}`);
    });
  }

  cleanupOldGames(): void {
    const now = new Date();
    const maxAge = 30 * 60 * 1000;

    for (const [gameId, game] of this.games.entries()) {
      if (now.getTime() - game.lastActivity.getTime() > maxAge) {
        game.players.forEach((player) => {
          this.playerGameMap.delete(player.id);
        });
        this.games.delete(gameId);
      }
    }
  }
}
