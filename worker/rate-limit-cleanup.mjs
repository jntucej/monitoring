import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { getWorkerDbPool } from './db.js';

// Periodic maintenance jobs run as cron-style intervals in the worker.
// Each job is idempotent and fail-safe: a single failure logs and continues.

function runJob(name, fn) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[worker] ${name} failed:`, err);
    }
  };
}

// Every 5 minutes: purge expired rate-limit buckets so the table doesn't grow.
// The table + cleanup function are created by the migration
// database/migrations/20261021000000_rate_limit_buckets.sql.
async function cleanupRateLimits() {
  const pool = getWorkerDbPool();
  await pool.query('SELECT public.cleanup_rate_limits()');
}

const jobs = [
  { name: 'rate-limit-cleanup', ms: 5 * 60 * 1000, run: runJob('rate-limit-cleanup', cleanupRateLimits) },
];

for (const job of jobs) {
  job.run(); // run once on start to clear any stale buckets from a prior window
  setInterval(job.run, job.ms);
}
