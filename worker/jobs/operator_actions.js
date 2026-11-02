// Worker: operator_actions listener + auto-expiry/auto-run scheduler.
//
// Two responsibilities:
//   1. LISTEN on the `operator_action_pending` NOTIFY channel fired by the
//      operator_actions INSERT trigger. On notify, send the Tier 2/3
//      Telegram alert (with a runbook link) via the existing notifier.
//   2. On a 5-minute interval, run expire_and_auto_run_operator_actions()
//      to expire stale pending rows and auto-execute risk='low' rows whose
//      window elapsed without a rejection.
//
// The pg LISTEN connection is a dedicated client (not the shared pool) so a
// long-lived LISTEN does not consume one of the 5 pooled connections that
// every other job needs.

import pg from 'pg';
import { getWorkerDbPool } from '../db.js';


// Phase 5 LEARN helper: set outcome + mttr_seconds on an executed action.
async function recordActionOutcome(pool, actionId, outcome) {
  try {
    await pool.query(
      `UPDATE public.operator_actions
          SET outcome = $2,
              mttr_seconds = EXTRACT(EPOCH FROM (NOW() - created_at))::int
        WHERE id = $1::uuid`,
      [actionId, outcome]
    );
  } catch (err) {
    console.error(`[operator-actions] failed to record outcome for ${actionId}:`, err.message);
  }
}

// Circuit breaker + cooldown (Phase 4 guardrails). Before any auto/notify
// action, check: (a) same-kind action hasn't failed 3x in 30 min, (b) last
// successful same-kind action was > cooldown_minutes ago. Returns true when
// the action is allowed to proceed.
async function actionGuardAllowed(pool, kind, cooldownMinutes = 30) {
  const fails = await pool.query(
    `SELECT count(*)::int AS c FROM public.operator_actions
      WHERE kind = $1 AND status = 'failed'
        AND decided_at > NOW() - INTERVAL '30 minutes'`,
    [kind]
  );
  if (Number(fails.rows[0]?.c) >= 3) {
    console.log(`[operator-actions] circuit breaker open for ${kind} (3 fails in 30m) — escalating`);
    return false;
  }
  const lastOk = await pool.query(
    `SELECT max(decided_at) AS last FROM public.operator_actions
      WHERE kind = $1 AND status IN ('executed','auto_executed')`,
    [kind]
  );
  if (lastOk.rows[0]?.last) {
    const ageMin = (Date.now() - new Date(lastOk.rows[0].last).getTime()) / 60000;
    if (ageMin < cooldownMinutes) {
      console.log(`[operator-actions] cooldown active for ${kind} (${Math.round(ageMin)}m < ${cooldownMinutes}m) — skipping`);
      return false;
    }
  }
  return true;
}



/**
 * Push the operator-action alert to Telegram (Tier 2/3 notification). The
 * existing telegram-notify.sh is the transport; we shell out to it with the
 * action summary + runbook link so every alert ends with "here is what to
 * do", not just "something is wrong".
 */
async function notifyOperatorAction(payload) {
  const link = `https://monitor.ucej.in/sysadmin/actions`;
  const runbook = `https://monitor.ucej.in/sysadmin/runbooks#${(payload.kind || '').toLowerCase()}`;
  const line =
    `⚠️ [${payload.risk?.toUpperCase() || 'UNKNOWN'}] ${payload.title || payload.kind || 'operator action'}\n` +
    `kind: ${payload.kind || '?'} · approver: ${payload.approver_role || 'sysadmin'}\n` +
    `Approve/reject: ${link}\nRunbook: ${runbook}`;

  const script = process.env.TELEGRAM_NOTIFY_SH || '/app/scripts/telegram-notify.sh';
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const run = promisify(execFile);
    await run('bash', [script, line], { timeout: 15_000 });
    console.log(`[operator-actions] telegram alert sent for ${payload.id}`);
  } catch (err) {
    // The NOTIFY was consumed even if the push failed — log loudly, never
    // crash the worker over an unreachable Telegram.
    console.error(`[operator-actions] telegram notify failed for ${payload.id}:`, err.message);
  }
}

let listenStopped = false;

export async function startOperatorActionListener() {
  const { Client } = pg;
  const connectionString =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || 'postgres'}:${encodeURIComponent(
      process.env.POSTGRES_PASSWORD || 'postgres'
    )}@${process.env.POSTGRES_HOST || '127.0.0.1'}:${process.env.POSTGRES_PORT || 5432}/${
      process.env.POSTGRES_DB || 'gate_monitor'
    }`;

  const listenLoop = async () => {
    while (!listenStopped) {
      // A fresh client on every attempt — pg's Client cannot be reconnected
      // after end(), so reusing one across disconnects throws
      // "Client has already been connected."
      const client = new Client({ connectionString });
      try {
        await client.connect();
        client.on('notification', async (msg) => {
          if (msg.channel !== 'operator_action_pending') return;
          try {
            const payload = JSON.parse(msg.payload || '{}');
            await notifyOperatorAction(payload);
          } catch (err) {
            console.error('[operator-actions] bad notify payload:', err.message);
          }
        });
        await client.query("LISTEN operator_action_pending");
        console.log('[operator-actions] LISTEN on operator_action_pending active');
        // Stay connected until the connection drops (network blip, restart).
        await new Promise((resolve) => {
          client.once('end', resolve);
          client.once('error', () => {}); // 'end' follows an error
        });
        console.log('[operator-actions] connection dropped, re-listening in 5s');
      } catch (err) {
        console.error('[operator-actions] listen error, retrying in 5s:', err.message);
      } finally {
        try { await client.end(); } catch { /* already closed */ }
      }
      if (!listenStopped) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };

  listenLoop().catch((err) => {
    console.error('[operator-actions] listener fatal:', err);
  });

  return {
    stop: async () => {
      listenStopped = true;
    },
  };
}

/**
 * Run the auto-expiry / auto-run function and execute any returned low-risk
 * auto-executed rows. Called on a 5-minute interval from worker/index.mjs.
 * Writes a worker_job_heartbeats row so a dead scheduler is detectable.
 */
export async function runOperatorActionMaintenance() {
  const pool = getWorkerDbPool();
  const poolMax = pool.max ?? 5;
  void poolMax;

  const res = await pool.query(
    `SELECT public.expire_and_auto_run_operator_actions() AS rows`
  );
  // The function returns jsonb[] — node-postgres deserializes it to a JS array.
  // Empty result = '[]' / [] -> no auto-execution needed.
  const raw = res.rows?.[0]?.rows;
  const autoRows = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);

  for (const row of autoRows) {
    // Phase 4 guardrails: circuit breaker + cooldown before any auto action.
    if (!(await actionGuardAllowed(pool, row.kind))) {
      await pool.query(
        `UPDATE public.operator_actions SET status='failed', outcome='failed', decided_at=NOW() WHERE id=$1::uuid`,
        [row.id]
      ).catch(() => {});
      continue;
    }
    // Tier 1 auto-execution: these are the reversible, low-risk actions
    // (restart_container, prune_backups, clear_email_queue, escalation).
    // The heavyweight executor is a shell script; we shell out for parity
    // with the human-approval path so both tiers share one code path.
    try {
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const run = promisify(execFile);
      await run('bash', [
        '/app/scripts/apply-operator-action.sh',
        row.id,
      ], { timeout: 60_000 });
      // Phase 5 LEARN: record the outcome so the forecaster's incident memory
      // grows. outcome='resolved' when the script exited 0; the signal_after
      // snapshot is the infra row 5 min later (best-effort, null on failure).
      const startedAt = Date.now();
      await recordActionOutcome(pool, row.id, 'resolved');
      console.log(`[operator-actions] auto-executed ${row.kind} (${row.id})`);
    } catch (err) {
      console.error(`[operator-actions] auto-exec failed for ${row.id}:`, err.message);
      await pool
        .query(
          `UPDATE public.operator_actions SET status='failed', decided_at=NOW() WHERE id=$1::uuid`,
          [row.id]
        )
        .catch(() => {});
    }
  }
  return autoRows.length;
}
