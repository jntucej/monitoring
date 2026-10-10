import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * PostgreSQL Connection Pool for Self-Hosted Architecture.
 */
let poolInstance: Pool | null = null;
let pgModule: any = null;

async function getPgModule() {
  if (!pgModule) {
    pgModule = await import("pg");
  }
  return pgModule;
}

export async function getPostgresPool(): Promise<Pool> {
  if (typeof window !== "undefined") {
    throw new Error("PostgreSQL pool cannot be accessed from client-side code");
  }

  if (!poolInstance) {
    const pg = await getPgModule();
    const PgPool = pg.Pool || pg.default?.Pool;
    const connectionString =
      process.env.DATABASE_URL ||
      `postgres://${process.env.POSTGRES_USER || "postgres"}:${encodeURIComponent(
        process.env.POSTGRES_PASSWORD || "postgres"
      )}@${process.env.POSTGRES_HOST || "127.0.0.1"}:${process.env.POSTGRES_PORT || "5432"}/${
        process.env.POSTGRES_DB || "gate_monitor"
      }`;

    const instance = new PgPool({
      connectionString,
      max: parseInt(process.env.PG_MAX_POOL_SIZE || "20", 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      query_timeout: 30000,
      ssl:
        process.env.PG_SSL === "true"
          ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false" }
          : undefined,
    }) as Pool;

    instance.on("error", (err: any, client: any) => {
      console.error("[PostgreSQL Pool Error]", {
        err,
        client: client ? "idle" : "unknown",
      });
    });

    poolInstance = instance;
  }

  return poolInstance!;
}

/**
 * Execute a parameterized query using a fast pool connection (no audit context).
 */
export async function poolQuery<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const pool = await getPostgresPool();
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    console.error(`[SQL Error] Query: ${text} | Params:`, params, "| Error:", err.message);
    throw err;
  }
}

/**
 * Execute a parameterized query with established user context for RLS.
 * Manages its own connection to ensure GUC isolation.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = [],
  options?: { currentUserId?: string }
): Promise<QueryResult<T>> {
  const pool = await getPostgresPool();
  const client = await pool.connect();
  try {
    if (options?.currentUserId) {
      await client.query("SELECT set_config('app.current_user_id', $1, false)", [options.currentUserId]);
    }
    return await client.query<T>(text, params);
  } catch (err: any) {
    console.error(`[SQL Error] Query: ${text} | Params:`, params, "| Error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a unit of work within a database transaction.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  options?: { currentUserId?: string }
): Promise<T> {
  const pool = await getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (options?.currentUserId) {
      await client.query("SET LOCAL app.current_user_id = $1", [options.currentUserId]);
    }
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("[PostgreSQL Rollback Error]", rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}
