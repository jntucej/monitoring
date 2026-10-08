import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

let poolInstance = null;

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

export function getWorkerDbPool() {
  loadEnvFile();

  if (!poolInstance) {
    const connectionString =
      process.env.DATABASE_URL ||
      `postgres://${process.env.POSTGRES_USER || 'postgres'}:${encodeURIComponent(
        process.env.POSTGRES_PASSWORD || 'postgres'
      )}@${process.env.POSTGRES_HOST || '127.0.0.1'}:${process.env.POSTGRES_PORT || '5432'}/${
        process.env.POSTGRES_DB || 'gate_monitor'
      }`;

    poolInstance = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.PG_SSL === 'true'
        ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
    });

    poolInstance.on('error', (err) => {
      console.error('[Worker DB Pool Error]', err.message);
    });
  }

  return poolInstance;
}

export async function query(text, params = []) {
  const pool = getWorkerDbPool();
  return pool.query(text, params);
}
