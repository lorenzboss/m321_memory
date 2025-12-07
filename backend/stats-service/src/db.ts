import pg from "pg";

const { Client } = pg;

let client: pg.Client | null = null;

function getClient(): pg.Client {
  if (!client) {
    const host = process.env.DOCKER_ENV ? "postgres-db" : "localhost";
    const connectionString =
      process.env.DATABASE_URL ||
      `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${host}:5432/${process.env.POSTGRES_DB}`;

    client = new Client({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              rejectUnauthorized: false,
            }
          : false,
    });

    client.connect((err: Error | null) => {
      if (err) {
        console.error("Error connecting to the database:", err.stack);
        process.exit(1);
      } else {
        console.log("Connected to the database.");
      }
    });
  }

  return client;
}

export async function executeQuery<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(sql: string, params: Array<string | number | boolean> = []): Promise<T[]> {
  const dbClient = getClient();
  return new Promise((resolve, reject) => {
    dbClient.query<T>(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.rows);
      }
    });
  });
}

export async function initializeDatabase(): Promise<void> {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS user_stats (
      username TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      total_time_played INTEGER NOT NULL DEFAULT 0,
      total_games_played INTEGER NOT NULL DEFAULT 0,
      highest_score INTEGER NOT NULL DEFAULT 0,
      total_matched_pairs INTEGER NOT NULL DEFAULT 0
    );
  `;

  const migrateUsernameColumnSql = `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_stats'
          AND column_name = 'email'
      ) THEN
        ALTER TABLE user_stats RENAME COLUMN email TO username;
      END IF;
    END
    $$;
  `;

  await executeQuery(createTableSql);
  await executeQuery(migrateUsernameColumnSql);
  console.log("Ensured user_stats table exists.");
}
