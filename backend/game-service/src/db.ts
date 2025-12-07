import pg from 'pg';

const { Client } = pg;

let client: pg.Client | null = null;

function getClient() {
  if (!client) {
    // Construct DATABASE_URL from environment variables
    // When running in Docker, always use 'postgres-db', locally use 'localhost'
    const host = process.env.DOCKER_ENV ? 'postgres-db' : 'localhost';
    const DATABASE_URL =
      process.env.DATABASE_URL ||
      `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${host}:5432/${process.env.POSTGRES_DB}`;

    client = new Client({
      connectionString: DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: false,
            }
          : false,
    });

    client.connect((err) => {
      if (err) {
        console.error('Error connecting to the database:', err.stack);
        process.exit(1);
      } else {
        console.log('Connected to the database.');
      }
    });
  }
  return client;
}

/**
 * Executes a SQL query with optional parameters.
 * @param {string} sql - The SQL query string. Use $1, $2, etc. as placeholders.
 * @param {(string|number|boolean)[]} [params=[]] - Parameters to substitute into the query.
 * @returns {Promise<any[]>} - Array of result rows.
 */
export function executeQuery(
  sql: string,
  params: (string | number | boolean)[] = [],
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const dbClient = getClient();
    dbClient.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.rows);
      }
    });
  });
}
