// Database layer for self-hosted PostgreSQL (replaces Supabase)
// Uses the 'pg' library directly for PostgreSQL connectivity

import { Pool, PoolClient } from 'pg';
import { getEnv } from './env';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const env = getEnv();

  pool = new Pool({
    connectionString: env.postgresUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err);
  });

  return pool;
}

export async function query(sql: string, params: any[] = []): Promise<any> {
  const p = getPool();
  const client = await p.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const p = getPool();
    const result = await p.query('SELECT 1 as connected');
    return !!result.rows[0]?.connected;
  } catch (e) {
    console.error('[DB] Connection test failed:', e);
    return false;
  }
}
