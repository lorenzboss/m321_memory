import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

export function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  sql = neon(process.env.DATABASE_URL);
  console.log("Database connection initialized");
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  if (!sql) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }

  try {
    const result = await sql(text, params);
    return result as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function initSchema() {
  if (!sql) {
    throw new Error("Database not initialized");
  }

  // Create users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]+$'),
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create user_stats table
  await query(`
    CREATE TABLE IF NOT EXISTS user_stats (
      username VARCHAR(255) PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_time_played INTEGER DEFAULT 0,
      total_games_played INTEGER DEFAULT 0,
      highest_score INTEGER DEFAULT 0,
      total_matched_pairs INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database schema initialized");
}
