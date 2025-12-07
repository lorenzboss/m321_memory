export interface UserStats {
  username: string;
  wins: number;
  losses: number;
  winRate?: number;
  totalTimePlayed: number;
  totalGamesPlayed: number;
  averageGameDuration?: number;
  highestScore: number;
  totalMatchedPairs: number;
}

export interface LeaderboardEntry {
  username: string;
  wins: number;
}
