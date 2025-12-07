export interface Card {
  id: string;
  pokemonId: number;
  pokemonName?: string;
  pokemonImg?: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy?: string;
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  isReady: boolean;
}

export interface Game {
  id: string;
  players: Player[];
  cards: Card[];
  currentPlayerIndex: number;
  status: "waiting" | "playing" | "finished";
  flippedCards: string[];
  scores: { [playerId: string]: number };
  createdAt: Date;
  lastActivity: Date;
  startTime?: Date;
  endTime?: Date;
  playerFinishTimes?: { [playerId: string]: Date };
  playerTotalTime?: { [playerId: string]: number };
  currentTurnStartTime?: Date;
  isProcessingMatch?: boolean;
}

export interface GameState {
  game: {
    id: string;
    players: Player[];
    cards: Card[];
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
  };
  currentPlayer: Player;
  isYourTurn: boolean;
  message?: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

export interface PlayerMatchStats {
  username: string;
  score: number;
  matchDuration: number;
  isWinner: boolean;
}

export interface UserStats {
  username: string;
  wins: number;
  losses: number;
  winRate: number;
  totalTimePlayed: number;
  totalGamesPlayed: number;
  averageGameDuration: number;
  highestScore: number;
  totalMatchedPairs: number;
}

export interface LeaderboardEntry {
  username: string;
  wins: number;
}
