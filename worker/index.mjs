import "./rate-limit-cleanup.mjs";
import http from "node:http";
import sendEmails from './jobs/send_emails.js';

// Worker health probe: the compose healthcheck (and any orchestrator) hits
// /health on 3001. Keep the process alive and report readiness. The rate-limit
// cleanup interval (imported above) plus the postCronEndpoint helper below are
// the worker's actual work; this listener exists so the container can report
// healthy rather than staying stuck in "starting" forever.
const WORKER_PORT = Number(process.env.WORKER_PORT || 3001);

const worker = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

worker.listen(WORKER_PORT, () => {
  console.log(`[worker] health listener on :${WORKER_PORT}`);
});

async function postCronEndpoint(path) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://web:3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`[worker] CRON_SECRET missing — refusing to call ${path}`);
    throw new Error("CRON_SECRET not set");
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[worker] ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

import { getWorkerDbPool } from './db.js';
import auditLogRotation from './jobs/audit_log_rotation.js';
import cleanupMovementLogs from './jobs/cleanup_movement_logs.js';
import dispatchNotifications from './jobs/dispatch_notifications.js';
import retryNotifications from './jobs/retry_notifications.js';
import cleanupEphemeral from './jobs/cleanup_ephemeral.js';

// Periodic maintenance jobs run as cron-style intervals in the worker.
// Each job is idempotent and fail-safe: a single failure logs and continues.

async function cleanupRateLimits() {
  const pool = getWorkerDbPool();
  await pool.query('SELECT public.cleanup_rate_limits()');
}

async function rotateAuditLogs() {
  await auditLogRotation();
}

const jobs = [
  { name: 'rate-limit-cleanup', ms: 5 * 60 * 1000, run: () => runJob('rate-limit-cleanup', cleanupRateLimits) },
  { name: 'email-dispatch',     ms: 2 * 60 * 1000, run: () => runJob('email-dispatch', sendEmails) },
  { name: 'notification-dispatch', ms: 2 * 60 * 1000, run: () => runJob('notification-dispatch', dispatchNotifications) },
  { name: 'notification-retry', ms: 5 * 60 * 1000, run: () => runJob('notification-retry', retryNotifications) },
  { name: 'cleanup-ephemeral', ms: 15 * 60 * 1000, run: () => runJob('cleanup-ephemeral', cleanupEphemeral) },
  { name: 'audit-log-rotation', ms: 60 * 60 * 1000, run: () => runJob('audit-log-rotation', rotateAuditLogs) },
  { name: 'cleanup-movement-logs', ms: 24 * 60 * 60 * 1000, run: () => runJob('cleanup-movement-logs', cleanupMovementLogs) },
];

for (const job of jobs) {
  job.run(); // run once on start (idempotent); then repeat on interval
  setInterval(job.run, job.ms);
}

console.log(
  `[worker] scheduled jobs: ${jobs.map((j) => `${j.name} (${j.ms / 60000}m)`).join(', ')}`
);
