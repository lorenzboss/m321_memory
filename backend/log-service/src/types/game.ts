export interface GameStartEvent {
  matchId: string;
  players: string[];
  timestamp: string;
}

export interface GameMoveEvent {
  matchId: string;
  player: string;
  flippedCard1: number;
  flippedCard2: number;
  match: boolean;
  remainingPairs: number;
  timestamp: string;
}

export interface GameEndEvent {
  matchId: string;
  winner: string;
  playerStats: Array<{
    email: string;
    score: number;
    time: number;
  }>;
  duration: number;
  timestamp: string;
}

export interface GameLog {
  game: string; // matchId as string for the game property
  start?: GameStartEvent;
  moves: GameMoveEvent[];
  end?: GameEndEvent;
}
