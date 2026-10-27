import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { getWorkerDbPool } from './db.js';
import auditLogRotation from './jobs/audit_log_rotation.js';

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

// Every hour: audit-rotate. Purges audit_logs / integration_logs /
// security_alerts / api_metrics past their retention windows.
//
// Without this, api_metrics (appended on every API request) grows
// unboundedly — the job exists in worker/jobs/audit_log_rotation.js but
// nothing scheduled it. /api/cron/audit-rotate (host cron, see
// scripts/setup-crons.sh) now does the same work from outside the worker;
// this interval is the in-process fallback so api_metrics stays bounded
// even if the host cron is not installed.
async function rotateAuditLogs() {
  await auditLogRotation();
}

const jobs = [
  { name: 'rate-limit-cleanup', ms: 5 * 60 * 1000, run: runJob('rate-limit-cleanup', cleanupRateLimits) },
  { name: 'audit-log-rotation', ms: 60 * 60 * 1000, run: runJob('audit-log-rotation', rotateAuditLogs) },
];

for (const job of jobs) {
  job.run(); // run once on start (idempotent); then repeat on interval
  setInterval(job.run, job.ms);
}

console.log(
  `[worker] scheduled jobs: ${jobs.map((j) => `${j.name} (${j.ms / 60000}m)`).join(', ')}`
);
