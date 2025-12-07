// Dummy Object Example
export const userStatsMock = {
  username: "lorenz",
  wins: 10,
  losses: 7,
  winRate: 58.82, // Calculated as (wins / totalGames) * 100
  totalTimePlayed: 3600,
  totalGamesPlayed: 17, // Calculated as wins + losses
  averageGameDuration: 210, // Calculated as totalTimePlayed / totalGames
  highestScore: 5,
  totalMatchedPairs: 8,
};

// In the database:
// username
// wins
// losses
// totalTimePlayed
// totalGamesPlayed
// highestScore
// totalMatchedPairs

export const leaderboardMock = [
  { username: "Alice", wins: 40 },
  { username: "Bob", wins: 35 },
  { username: "Charlie", wins: 30 },
  { username: "Diana", wins: 25 },
];
