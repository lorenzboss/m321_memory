export interface Player {
  id: string;
  name: string;
  email: string;
  socketId: string;
  isReady: boolean;
}

export interface Card {
  id: string;
  pokemonName: string;
  pokemonImg: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy?: string; // ID des Spielers der das Match gemacht hat
}

export interface Game {
  id: string;
  players: Player[];
  cards: Card[];
  currentPlayerIndex: number;
  status: 'waiting' | 'playing' | 'finished';
  flippedCards: string[];
  scores: { [playerId: string]: number };
  createdAt: Date;
  lastActivity: Date;
  startTime?: Date; // Wann das Spiel gestartet wurde
  finishTime?: Date; // Wann das Spiel beendet wurde
  winner?: string; // ID des Gewinners
  isProcessingMatch?: boolean; // Verhindert weitere Züge während Match-Prüfung
  playerFinishTimes?: { [playerId: string]: Date }; // Wann jeder Spieler sein letztes Match gemacht hat
  playerTotalTime?: { [playerId: string]: number }; // Gesamte Bedenkzeit in Sekunden
  currentTurnStartTime?: Date; // Wann der aktuelle Zug begonnen hat
}

export interface GameState {
  game: Game;
  currentPlayer: Player;
  isYourTurn: boolean;
  message?: string;
}
