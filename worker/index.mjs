import http from "node:http";
import sendEmails from './jobs/send_emails.js';
import { handleFalcoWebhook } from './webhooks/falco_receiver.js';

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

  // SOAR webhook: Falcosidekick POSTs critical Falco alerts here. The
  // handler isolates the container, locks the account, records the action
  // in operator_actions, and alerts on Telegram.
  if (req.url === "/falco-webhook" && req.method === "POST") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        handleFalcoWebhook(payload, res).catch((err) => {
          console.error("[worker] falco webhook handler error:", err.message);
          res.writeHead(500).end("handler error");
        });
      } catch {
        res.writeHead(400).end("invalid JSON");
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

worker.listen(WORKER_PORT, () => {
  console.log(`[worker] health + SOAR listener on :${WORKER_PORT}`);
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
import sendSmsQueue from './jobs/send_sms.js';
import hardDeleteExpired from './jobs/hard_delete_expired.js';
import { startOperatorActionListener, runOperatorActionMaintenance } from './jobs/operator_actions.js';
import collectInfraSnapshot from './jobs/infra_snapshot_collector.js';
import runInfraForecaster from './jobs/infra_forecaster.js';

/**
 * Job heartbeat sentinel: after each scheduled run, upsert a row in
 * worker_job_heartbeats so an external checker (sysadmin jobs API, a
 * Prometheus alert, or a host-level cron) can detect a job that silently
 * stopped running. The dead-man's-switch pattern: a stale heartbeat is the
 * failure signal, not a successful run.
 */
async function writeJobHeartbeat(name, ok, err) {
  try {
    const pool = getWorkerDbPool();
    await pool.query(
      `INSERT INTO public.worker_job_heartbeats (job_name, last_run_at, last_status, last_error, runs_total)
       VALUES ($1, NOW(), $2, $3, 1)
       ON CONFLICT (job_name) DO UPDATE SET
         last_run_at = NOW(),
         last_status = $2,
         last_error  = $3,
         runs_total  = public.worker_job_heartbeats.runs_total + 1`,
      [name, ok ? 'ok' : 'error', ok ? null : (err?.message ?? String(err)).slice(0, 500)]
    );
    // Paste #15 Level 8: also write an audit_logs row so the post-recovery
    // verification script (verify-post-recovery.sh) can check
    // `SELECT max(created_at) FROM audit_logs WHERE action='WORKER_HEARTBEAT'`
    // without depending on the worker_job_heartbeats table.
    await pool.query(
      `INSERT INTO public.audit_logs (action, details)
       VALUES ('WORKER_HEARTBEAT', $1::jsonb)`,
      [JSON.stringify({ job: name, status: ok ? 'ok' : 'error' })]
    );
  } catch (hbErr) {
    // Heartbeat write failure must not take down the job run.
    console.error(`[worker] heartbeat write failed for ${name}:`, hbErr);
  }
}

// Periodic maintenance jobs run as cron-style intervals in the worker.
// Each job is idempotent and fail-safe: a single failure logs and continues.

async function cleanupRateLimits() {
  const pool = getWorkerDbPool();
  await pool.query('SELECT public.cleanup_rate_limits()');
}

// Advisory-lock-wrapped job runner: only one worker may run a given job at a
// time (multi-replica safe). A per-job error is logged and never blocks the
// remaining jobs.
async function runJob(name, fn) {
  const pool = getWorkerDbPool();
  try {
    const { rows } = await pool.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
      [`worker:${name}`]
    );
    if (!rows[0].locked) {
      console.log(`[worker] ${name} skipped — another worker holds the lock`);
      return;
    }
    const startedAt = Date.now();
    let jobError = null;
    try {
      await fn();
    } catch (err) {
      jobError = err;
    }
    await writeJobHeartbeat(name, !jobError, jobError);
    console.log(`[worker] ${name} finished in ${Date.now() - startedAt}ms${jobError ? ` (error: ${jobError.message})` : ''}`);
    await pool.query("SELECT pg_advisory_unlock(hashtext($1))", [`worker:${name}`]);
    if (jobError) {
      // Re-throw so the caller's catch (if any) logs it; the heartbeat
      // already recorded it, so this is purely for the structured log.
      console.error(`[worker] ${name} failed:`, jobError);
    }
  } catch (err) {
    await writeJobHeartbeat(name, false, err);
    console.error(`[worker] ${name} lock/run error:`, err);
  }
}

async function rotateAuditLogs() {
  await auditLogRotation();
}

const jobs = [
  { name: 'rate-limit-cleanup', ms: 5 * 60 * 1000, run: () => runJob('rate-limit-cleanup', cleanupRateLimits) },
  { name: 'email-dispatch',     ms: 2 * 60 * 1000, run: () => runJob('email-dispatch', sendEmails) },
  { name: 'sms-dispatch',       ms: 30 * 1000, run: () => runJob('sms-dispatch', sendSmsQueue) },
  { name: 'notification-dispatch', ms: 2 * 60 * 1000, run: () => runJob('notification-dispatch', dispatchNotifications) },
  { name: 'notification-retry', ms: 5 * 60 * 1000, run: () => runJob('notification-retry', retryNotifications) },
  { name: 'cleanup-ephemeral', ms: 15 * 60 * 1000, run: () => runJob('cleanup-ephemeral', cleanupEphemeral) },
  { name: 'audit-log-rotation', ms: 60 * 60 * 1000, run: () => runJob('audit-log-rotation', rotateAuditLogs) },
  { name: 'cleanup-movement-logs', ms: 24 * 60 * 60 * 1000, run: () => runJob('cleanup-movement-logs', cleanupMovementLogs) },
  { name: 'hard-delete-expired', ms: 60 * 60 * 1000, run: () => runJob('hard-delete-expired', hardDeleteExpired) },
  { name: 'operator-action-maintenance', ms: 5 * 60 * 1000, run: () => runJob('operator-action-maintenance', async () => {
    await runOperatorActionMaintenance();
  }) },
  { name: 'infra-snapshot', ms: 60 * 1000, run: () => runJob('infra-snapshot', collectInfraSnapshot) },
  { name: 'infra-forecaster', ms: 5 * 60 * 1000, run: () => runJob('infra-forecaster', runInfraForecaster) },
];

// The pg LISTEN channel for operator_action_pending is a dedicated client
// (not a pooled connection) so a long-lived LISTEN never competes with the
// jobs that share the 5-connection worker pool. Start it once; the loop
// re-listens on disconnect.
startOperatorActionListener().catch((err) => {
  console.error('[worker] operator-actions listener failed to start:', err.message);
});

for (const job of jobs) {
  job.run(); // run once on start (idempotent); then repeat on interval
  setInterval(job.run, job.ms);
}

console.log(
  `[worker] scheduled jobs: ${jobs.map((j) => `${j.name} (${j.ms / 60000}m)`).join(', ')}`
);
