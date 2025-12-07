import { query } from "../db";
import { LeaderboardEntry, PlayerMatchStats, UserStats } from "../types";

interface UserStatsRow {
  username: string;
  wins: number;
  losses: number;
  total_time_played: number;
  total_games_played: number;
  highest_score: number;
  total_matched_pairs: number;
}

export class StatsService {
  async upsertUserStatsForMatch(playerStats: PlayerMatchStats): Promise<void> {
    const winsIncrement = playerStats.isWinner ? 1 : 0;
    const lossesIncrement = playerStats.isWinner ? 0 : 1;
    const timePlayed = Number.isFinite(playerStats.matchDuration)
      ? playerStats.matchDuration
      : 0;
    const score = playerStats.score ?? 0;
    const matchedPairs = Math.floor(score / 2);

    await query(
      `
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
        total_matched_pairs = user_stats.total_matched_pairs + EXCLUDED.total_matched_pairs,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        playerStats.username,
        winsIncrement,
        lossesIncrement,
        timePlayed,
        1,
        score,
        matchedPairs,
      ]
    );
  }

  async getAllStats(): Promise<UserStats[]> {
    const rows = await query<UserStatsRow>(
      `SELECT username, wins, losses, total_time_played, total_games_played, 
              highest_score, total_matched_pairs
       FROM user_stats
       ORDER BY wins DESC, highest_score DESC`
    );

    return rows.map(this.mapRowToUserStats);
  }

  async getStatsByUsername(username: string): Promise<UserStats | null> {
    const rows = await query<UserStatsRow>(
      `SELECT username, wins, losses, total_time_played, total_games_played,
              highest_score, total_matched_pairs
       FROM user_stats
       WHERE username = $1`,
      [username]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToUserStats(rows[0]);
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const rows = await query<{ username: string; wins: number }>(
      `SELECT username, wins
       FROM user_stats
       ORDER BY wins DESC, highest_score DESC
       LIMIT $1`,
      [limit]
    );

    return rows;
  }

  private mapRowToUserStats(row: UserStatsRow): UserStats {
    const totalGames = row.total_games_played || 0;
    const wins = row.wins || 0;
    const losses = row.losses || 0;
    const totalTimePlayed = row.total_time_played || 0;

    return {
      username: row.username,
      wins,
      losses,
      winRate: totalGames > 0 ? wins / totalGames : 0,
      totalTimePlayed,
      totalGamesPlayed: totalGames,
      averageGameDuration: totalGames > 0 ? totalTimePlayed / totalGames : 0,
      highestScore: row.highest_score || 0,
      totalMatchedPairs: row.total_matched_pairs || 0,
    };
  }
}

export const statsService = new StatsService();
