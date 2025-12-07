import { Card, Game, GameState, Player } from '../types/game';
import { pokemons } from '../utils/pokemons';
import { mqttService } from './MqttService';

export class GameManager {
  private games: Map<string, Game> = new Map();
  private playerGameMap: Map<string, string> = new Map();

  // Erstelle ein neues Spiel
  createGame(player: Player): string {
    const gameId = this.generateGameId();
    const cards = this.generateCards();

    const game: Game = {
      id: gameId,
      players: [player],
      cards,
      currentPlayerIndex: 0,
      status: 'waiting',
      flippedCards: [],
      scores: { [player.id]: 0 },
      createdAt: new Date(),
      lastActivity: new Date(),
      playerFinishTimes: {},
      playerTotalTime: {},
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(player.id, gameId);

    return gameId;
  }

  // Spieler einem Spiel hinzufügen
  joinGame(gameId: string, player: Player): boolean {
    const game = this.games.get(gameId);

    if (!game) {
      return false;
    }

    if (game.players.length >= 2) {
      return false;
    }

    if (game.status !== 'waiting') {
      return false;
    }

    // Prüfe ob Spieler bereits im Spiel ist
    const existingPlayer = game.players.find((p) => p.id === player.id);
    if (existingPlayer) {
      return true; // Erlaube erneutes Joinen für den gleichen Spieler
    }

    game.players.push(player);
    game.scores[player.id] = 0;
    this.playerGameMap.set(player.id, gameId);

    // Wenn 2 Spieler da sind, starte das Spiel
    if (game.players.length === 2) {
      this.startGame(gameId);
    }

    game.lastActivity = new Date();
    return true;
  }

  // Starte das Spiel
  private startGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.status = 'playing';
    game.startTime = new Date(); // Startzeit setzen

    // Initialisiere Bedenkzeiten
    if (!game.playerTotalTime) game.playerTotalTime = {};
    game.players.forEach((player) => {
      game.playerTotalTime![player.id] = 0;
    });

    // Zufällig bestimmen, wer anfängt
    game.currentPlayerIndex = Math.floor(Math.random() * 2);

    // Starte den Timer für den ersten Spieler
    game.currentTurnStartTime = new Date();

    game.lastActivity = new Date();

    // MQTT Event: Spiel gestartet
    mqttService.publishGameStart({
      matchId: gameId,
      players: game.players.map((p) => p.name),
      timestamp: new Date().toISOString(),
    });
  }

  // Karte umdrehen
  flipCard(gameId: string, playerId: string, cardId: string): GameState | null {
    const game = this.games.get(gameId);

    if (!game || game.status !== 'playing' || game.isProcessingMatch) {
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

    // Karte umdrehen
    card.isFlipped = true;
    game.flippedCards.push(cardId);

    // Wenn 2 Karten aufgedeckt sind, blockiere weitere Aktionen
    if (game.flippedCards.length === 2) {
      game.isProcessingMatch = true;
    }

    game.lastActivity = new Date();
    return this.getGameState(gameId, playerId);
  }

  // Aktualisiere die Zeit für den aktuellen Spieler
  private updateCurrentPlayerTime(game: Game): void {
    if (!game.currentTurnStartTime || !game.playerTotalTime) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    const turnDuration = Date.now() - game.currentTurnStartTime.getTime();

    // Addiere die aktuelle Zug-Zeit zur Gesamtzeit des Spielers
    game.playerTotalTime[currentPlayer.id] =
      (game.playerTotalTime[currentPlayer.id] || 0) + turnDuration;
  }

  // Prüfe auf Match
  private checkMatch(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game || game.flippedCards.length !== 2) return;

    // Aktualisiere die Zeit für den aktuellen Spieler
    this.updateCurrentPlayerTime(game);

    const [cardId1, cardId2] = game.flippedCards;
    const card1 = game.cards.find((c) => c.id === cardId1);
    const card2 = game.cards.find((c) => c.id === cardId2);

    if (!card1 || !card2) return;

    const isMatch = card1.pokemonName === card2.pokemonName;
    const currentPlayer = game.players[game.currentPlayerIndex];

    // Berechne die Position der Karten im Array (für MQTT Event)
    const card1Position = game.cards.findIndex((c) => c.id === cardId1);
    const card2Position = game.cards.findIndex((c) => c.id === cardId2);

    if (isMatch) {
      // Match gefunden
      card1.isMatched = true;
      card2.isMatched = true;
      card1.matchedBy = currentPlayer.id;
      card2.matchedBy = currentPlayer.id;

      game.scores[currentPlayer.id]++;

      // Aktualisiere die Finish-Zeit für diesen Spieler
      if (!game.playerFinishTimes) game.playerFinishTimes = {};
      game.playerFinishTimes[currentPlayer.id] = new Date();

      // Spieler darf nochmal (currentPlayerIndex bleibt gleich)
      // Timer läuft weiter für den gleichen Spieler - ABER wir müssen ihn neu starten
      game.currentTurnStartTime = new Date();
    } else {
      // Kein Match - Karten wieder umdrehen
      card1.isFlipped = false;
      card2.isFlipped = false;

      // Nächster Spieler ist dran
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

      // Starte Timer für neuen Spieler
      game.currentTurnStartTime = new Date();
    }

    // MQTT Event: Spielzug
    const remainingPairs = Math.floor(game.cards.filter((c) => !c.isMatched).length / 2);
    mqttService.publishGameMove({
      matchId: gameId,
      player: currentPlayer.name,
      flippedCard1: card1Position,
      flippedCard2: card2Position,
      match: isMatch,
      remainingPairs: remainingPairs,
      timestamp: new Date().toISOString(),
    });

    game.flippedCards = [];
    game.isProcessingMatch = false; // Match-Verarbeitung beendet

    // Prüfe ob Spiel beendet ist
    const allMatched = game.cards.every((card) => card.isMatched);
    if (allMatched) {
      // Finale Zeit-Aktualisierung für den aktuellen Spieler
      this.updateCurrentPlayerTime(game);

      game.status = 'finished';
      game.finishTime = new Date();
      game.winner = this.determineWinner(game);

      // MQTT Event: Spiel beendet
      this.publishGameEndEvent(game);
    }

    game.lastActivity = new Date();
  }

  // Öffentliche Methode für den SocketHandler um Match-Prüfung zu triggern
  public triggerMatchCheck(
    gameId: string,
    socketHandler: { broadcastGameUpdate: (gameId: string) => void },
  ): void {
    setTimeout(() => {
      this.checkMatch(gameId);
      // Benachrichtige den SocketHandler über das Update
      const game = this.getGame(gameId);
      if (game && socketHandler) {
        socketHandler.broadcastGameUpdate(gameId);
      }
    }, 800); // Reduziert von 1500ms auf 800ms
  }

  // Spieler verlässt Spiel
  leaveGame(playerId: string): string | null {
    const gameId = this.playerGameMap.get(playerId);
    if (!gameId) return null;

    const game = this.games.get(gameId);
    if (!game) return null;

    // Entferne Spieler aus dem Spiel
    game.players = game.players.filter((p) => p.id !== playerId);
    delete game.scores[playerId];
    this.playerGameMap.delete(playerId);

    // Wenn keine Spieler mehr da sind, lösche das Spiel
    if (game.players.length === 0) {
      this.games.delete(gameId);
    } else {
      // Wenn nur noch ein Spieler da ist, beende das Spiel
      game.status = 'finished';
    }

    return gameId;
  }

  // Hole Spielstatus
  getGameState(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return null;

    const currentPlayer = game.players[game.currentPlayerIndex];
    const isYourTurn = currentPlayer?.id === playerId;

    return {
      game,
      currentPlayer,
      isYourTurn,
      message: this.getGameMessage(game, isYourTurn, playerId),
    };
  }

  // Hole Spiel nach ID
  getGame(gameId: string): Game | null {
    return this.games.get(gameId) || null;
  }

  // Finde Spiel eines Spielers
  getPlayerGameId(playerId: string): string | null {
    return this.playerGameMap.get(playerId) || null;
  }

  // Generiere Spielkarten
  private generateCards(): Card[] {
    // Wähle 8 zufällige Pokemon aus
    const shuffledPokemons = [...pokemons].sort(() => Math.random() - 0.5);
    const selectedPokemons = shuffledPokemons.slice(0, 8);

    const cards: Card[] = [];
    selectedPokemons.forEach((pokemon, index) => {
      // Erstelle 2 Karten pro Pokemon
      cards.push({
        id: `${index}-1`,
        pokemonName: pokemon.name,
        pokemonImg: pokemon.img,
        isFlipped: false,
        isMatched: false,
      });
      cards.push({
        id: `${index}-2`,
        pokemonName: pokemon.name,
        pokemonImg: pokemon.img,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Mische die Karten
    const shuffledCards = cards.sort(() => Math.random() - 0.5);

    // DEBUG: Zeige die Memory-Lösung in der Konsole (nur für Development)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n----------------------------------------');
      console.log('🎯 MEMORY GAME SOLUTION (Dev Mode):');

      // Erstelle eine Map um Paare zu finden und nummeriere sie
      const pairMap = new Map<string, number>();
      let pairNumber = 1;

      // Gehe durch alle Karten und weise jedem Pokemon eine Nummer zu
      shuffledCards.forEach((card) => {
        if (!pairMap.has(card.pokemonName)) {
          pairMap.set(card.pokemonName, pairNumber);
          pairNumber++;
        }
      });

      // Erstelle das 4x4 Grid mit Pair-Nummern
      console.log('Grid Layout (same numbers = matching pair):');
      for (let row = 0; row < 4; row++) {
        let rowString = '';
        for (let col = 0; col < 4; col++) {
          const index = row * 4 + col;
          const card = shuffledCards[index];
          const pairNum = pairMap.get(card.pokemonName);
          rowString += pairNum + ' ';
        }
        console.log(rowString.trim());
      }

      console.log('\nPair reference:');
      pairMap.forEach((number, pokemonName) => {
        console.log(`${number}: ${pokemonName}`);
      });
      console.log('----------------------------------------\n');
    }

    return shuffledCards;
  }

  // Bestimme den Gewinner
  private determineWinner(game: Game): string {
    const players = game.players;
    const scores = game.scores;

    // Sortiere Spieler nach Score (höchster zuerst)
    const sortedByScore = players.sort((a, b) => {
      const scoreA = scores[a.id] || 0;
      const scoreB = scores[b.id] || 0;
      return scoreB - scoreA;
    });

    const player1 = sortedByScore[0];
    const player2 = sortedByScore[1];
    const score1 = scores[player1.id] || 0;
    const score2 = scores[player2.id] || 0;

    // Wenn unterschiedliche Scores, gewinnt der mit mehr Matches
    if (score1 !== score2) {
      return player1.id;
    }

    // Bei Gleichstand: Der mit der geringeren Gesamtbedenkzeit gewinnt
    if (game.playerTotalTime) {
      const time1 = game.playerTotalTime[player1.id] || 0;
      const time2 = game.playerTotalTime[player2.id] || 0;

      // Der Spieler mit der geringeren Gesamtbedenkzeit gewinnt
      if (time1 < time2) {
        return player1.id;
      } else if (time2 < time1) {
        return player2.id;
      }
    }

    // Fallback: Erster Spieler gewinnt
    return player1.id;
  }

  // Generiere eindeutige Spiel-ID (4-stellige Zahlen)
  private generateGameId(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Generiere Spielnachricht
  private getGameMessage(game: Game, isYourTurn: boolean, currentPlayerId: string): string {
    switch (game.status) {
      case 'waiting':
        return 'Waiting for another player to join...';
      case 'playing':
        return isYourTurn ? 'Your turn!' : 'Waiting for opponent...';
      case 'finished': {
        if (!game.winner) return 'Game finished!';

        const _winner = game.players.find((p) => p.id === game.winner);
        const loser = game.players.find((p) => p.id !== game.winner);
        const _currentPlayer = game.players.find((p) => p.id === currentPlayerId);
        const currentPlayerScore = game.scores[currentPlayerId] || 0;
        const winnerScore = game.scores[game.winner] || 0;
        const loserScore = game.scores[loser?.id || ''] || 0;

        // Prüfe ob Gleichstand bei Matches war
        const isScoreTie = winnerScore === loserScore;

        if (game.winner === currentPlayerId) {
          if (isScoreTie && game.playerTotalTime && loser) {
            // Gewonnen durch Zeit bei Gleichstand - verwende playerTotalTime
            const winTime = Math.round((game.playerTotalTime[currentPlayerId] || 0) / 1000);
            const loseTime = Math.round((game.playerTotalTime[loser.id] || 0) / 1000);
            return ` You won! Both found ${currentPlayerScore} matches, but you were faster (${winTime}s vs ${loseTime}s)!`;
          }
          return ` You won! You found ${currentPlayerScore} matches!`;
        }

        if (isScoreTie && game.playerTotalTime && loser) {
          // Verloren durch Zeit bei Gleichstand
          const winTime = Math.round((game.playerTotalTime[game.winner] || 0) / 1000);
          const loseTime = Math.round((game.playerTotalTime[currentPlayerId] || 0) / 1000);
          return ` You lost! Both found ${currentPlayerScore} matches, but your opponent was faster (${winTime}s vs ${loseTime}s)!`;
        }

        return ` You lost! You found ${currentPlayerScore} matches, opponent found ${winnerScore}!`;
      }
      default:
        return '';
    }
  }

  // Cleanup-Funktion für alte Spiele
  cleanupOldGames(): void {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 Minuten

    for (const [gameId, game] of this.games.entries()) {
      if (now.getTime() - game.lastActivity.getTime() > maxAge) {
        // Entferne alle Spieler aus der playerGameMap
        game.players.forEach((player) => {
          this.playerGameMap.delete(player.id);
        });
        this.games.delete(gameId);
      }
    }
  }

  // MQTT Event: Spiel beendet
  private publishGameEndEvent(game: Game): void {
    if (!game.startTime || !game.finishTime || !game.winner) return;

    const gameDuration = Math.round((game.finishTime.getTime() - game.startTime.getTime()) / 1000);

    const playerStats = game.players.map((player) => {
      const score = game.scores[player.id] || 0;

      // Verwende die tatsächlich getrackte Bedenkzeit
      let playerTime = game.playerTotalTime?.[player.id] || 0;
      playerTime = Math.round(playerTime / 1000); // Konvertiere von ms zu Sekunden

      // Sanity check: Stelle sicher, dass die Zeit realistisch ist
      if (playerTime <= 0 || playerTime > gameDuration) {
        // Fallback: Schätze basierend auf der Spieldauer und Matches
        const totalMatches = Object.values(game.scores).reduce((sum, s) => sum + s, 0);
        if (totalMatches > 0) {
          playerTime = Math.round((gameDuration * score) / totalMatches);
        } else {
          playerTime = Math.round(gameDuration / 2);
        }
      }

      return {
        username: player.name,
        score: score,
        time: Math.max(1, Math.min(playerTime, gameDuration - 1)), // Mindestens 1s, maximal gameDuration-1s
      };
    });

    mqttService.publishGameEnd({
      matchId: game.id,
      winner: game.players.find((p) => p.id === game.winner)?.name || '',
      playerStats: playerStats,
      duration: gameDuration,
      timestamp: new Date().toISOString(),
    });
  }
}
