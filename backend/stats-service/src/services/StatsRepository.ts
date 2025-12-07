import { executeQuery } from "../db";

export interface PlayerMatchStats {
  username: string;
  score: number;
  matchDuration: number;
  isWinner: boolean;
}

interface UserStatsRow {
  username: string;
  wins: number;
  losses: number;
  total_time_played: number;
  total_games_played: number;
  highest_score: number;
  total_matched_pairs: number;
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

const UPSERT_USER_STATS_SQL = `
  INSERT INTO user_stats (
    username,
    wins,
    losses,
    total_time_played,
    total_games_played,
    highest_score,
    total_matched_pairs
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (username) DO UPDATE SET
    wins = user_stats.wins + EXCLUDED.wins,
    losses = user_stats.losses + EXCLUDED.losses,
    total_time_played = user_stats.total_time_played + EXCLUDED.total_time_played,
    total_games_played = user_stats.total_games_played + EXCLUDED.total_games_played,
    highest_score = GREATEST(user_stats.highest_score, EXCLUDED.highest_score),
    total_matched_pairs = user_stats.total_matched_pairs + EXCLUDED.total_matched_pairs
  RETURNING *;
`;

const GET_ALL_STATS_SQL = `
  SELECT username,
         wins,
         losses,
         total_time_played,
         total_games_played,
         highest_score,
         total_matched_pairs
    FROM user_stats
    ORDER BY wins DESC, highest_score DESC;
`;

const GET_STATS_BY_USERNAME_SQL = `
  SELECT username,
         wins,
         losses,
         total_time_played,
         total_games_played,
         highest_score,
         total_matched_pairs
    FROM user_stats
   WHERE username = $1;
`;

const GET_LEADERBOARD_SQL = `
  SELECT username,
         wins
    FROM user_stats
    ORDER BY wins DESC, highest_score DESC
    LIMIT $1;
`;

export async function upsertUserStatsForMatch(
  playerStats: PlayerMatchStats,
): Promise<void> {
  const winsIncrement = playerStats.isWinner ? 1 : 0;
  const lossesIncrement = playerStats.isWinner ? 0 : 1;
  const timePlayed = Number.isFinite(playerStats.matchDuration)
    ? playerStats.matchDuration
    : 0;
  const score = playerStats.score ?? 0;

  await executeQuery<UserStatsRow>(UPSERT_USER_STATS_SQL, [
    playerStats.username,
    winsIncrement,
    lossesIncrement,
    timePlayed,
    1,
    score,
    score,
  ]);
}

function mapRow(row: UserStatsRow): UserStats {
  const totalGames = row.total_games_played || row.wins + row.losses;
  const safeTotalGames = totalGames > 0 ? totalGames : row.wins + row.losses;
  const computedTotalGames = safeTotalGames > 0 ? safeTotalGames : 0;
  const winRate = computedTotalGames
    ? Number(((row.wins / computedTotalGames) * 100).toFixed(2))
    : 0;
  const averageGameDuration = computedTotalGames
    ? Math.round(row.total_time_played / computedTotalGames)
    : 0;

  return {
    username: row.username,
    wins: row.wins,
    losses: row.losses,
    winRate,
    totalTimePlayed: row.total_time_played,
    totalGamesPlayed: computedTotalGames,
    averageGameDuration,
    highestScore: row.highest_score,
    totalMatchedPairs: row.total_matched_pairs,
  };
}

export async function getAllUserStats(): Promise<UserStats[]> {
  const rows = await executeQuery<UserStatsRow>(GET_ALL_STATS_SQL);
  return rows.map(mapRow);
}

export async function getUserStatsByUsername(
  username: string,
): Promise<UserStats | null> {
  const rows = await executeQuery<UserStatsRow>(GET_STATS_BY_USERNAME_SQL, [
    username,
  ]);
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
  const rows = await executeQuery<LeaderboardEntry>(GET_LEADERBOARD_SQL, [
    safeLimit,
  ]);
  return [...rows].sort((a, b) => b.wins - a.wins);
}
