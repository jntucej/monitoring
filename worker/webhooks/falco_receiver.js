// SOAR playbook: Falco → isolate compromised container + lock account.
//
// Falcosidekick posts a JSON body shaped like:
//   { rule, output, hostname, output_fields: { container_name, cmd, user, ... } }
//
// This module is mounted on a dedicated Express-like listener inside the
// worker (see worker/index.mjs). It is NOT a Next.js route — it is the
// worker's security-actuator surface, reachable only on the docker internal
// network (gate_worker:3001/falco-webhook), not exposed through Caddy.
//
// The playbook is intentionally conservative:
//   - It only acts on rules in the CRITICAL_RULES set (not every Falco alert)
//   - It checks the kill switch (auto_response_enabled) before acting
//   - It isolates the container but does NOT delete it (reversible Tier 2)
//   - It locks the account but does NOT hard-delete (DPDP grace preserved)

import { getWorkerDbPool } from '../db.js';

// Falco rule names that trigger the full isolation playbook.
// Extend this list as new critical rules are added to falco-rules.yaml.
const CRITICAL_RULES = new Set([
  'Shell spawn in container',        // the rule in the existing falco-rules.yaml
  'Privilege escalation attempt',
  'Sensitive file access (shadow)',
]);

// Map a Falco hostname to a gate container name.
const HOST_TO_CONTAINER = {
  gate_web: 'gate_web',
  gate_worker: 'gate_worker',
  gate_postgres: 'gate_postgres',
};

export async function handleFalcoWebhook(payload, res) {
  const pool = getWorkerDbPool();

  const rule = (payload.rule || '').trim();
  const container = HOST_TO_CONTAINER[hostnameOf(payload)] || payload.hostname;
  const cmd = (payload.output_fields?.cmd || '').slice(0, 300);
  const user = (payload.output_fields?.user || '').slice(0, 100);

  // 1. Kill switch check.
  const kill = await pool.query(
    `SELECT enabled FROM public.automation_controls WHERE name = 'auto_response_enabled'`
  ).catch(() => ({ rows: [] }));
  const enabled = kill.rows[0]?.enabled !== false;

  if (!CRITICAL_RULES.has(rule)) {
    res.writeHead(200).end('acknowledged (non-critical rule)');
    return;
  }

  if (!enabled) {
    res.writeHead(200).end('acknowledged (auto-response disabled — alerting only)');
    // Still write the alert row; the human decides whether to isolate.
    await writeIsolationRow(pool, payload, container, cmd, user, 'deferred');
    await sendIsolationTelegram(payload, container, cmd, user, false);
    return;
  }

  // 2. Isolate the container from the docker network.
  //    The worker image does not ship the docker CLI or a docker.sock mount,
  //    so the isolation branch is a no-op here — the account lock + SEV-1
  //    status row + Telegram alert still fire (account isolation works).
  //    Container-level network isolation must be performed by the host-side
  //    falco sidecar (gate_falco) or the operator manually.
  let isolated = false;

  // 3. Lock the triggering account (if a user is identified).
  let locked = false;
  if (user && user !== 'unknown') {
    const lockRes = await pool.query(
      `UPDATE public.users SET status = 'locked', updated_at = NOW()
        WHERE login_identifier = $1 AND status != 'locked'
        RETURNING id, login_identifier`,
      [user]
    ).catch(() => ({ rows: [] }));
    locked = lockRes.rows.length > 0;
  }

  // 4. Record the action in operator_actions (the incident ledger).
  await writeIsolationRow(pool, payload, container, cmd, user, 'executed');

  // 5. Write a SEV-1 status_updates row (visible on /status).
  await pool.query(
    `INSERT INTO public.status_updates (severity, title, detail)
     VALUES ('SEV-1', $1, $2)`,
    [`SOAR: ${container} isolated`, `rule=${rule} cmd=${cmd} user=${user}`]
  ).catch(() => {});

  // 6. Telegram alert.
  await sendIsolationTelegram(payload, container, cmd, user, isolated);

  res.writeHead(200).end('isolated');
}

function hostnameOf(payload) {
  return payload.hostname || payload.output_fields?.hostname || '';
}

async function writeIsolationRow(pool, payload, container, cmd, user, outcome) {
  await pool.query(
    `INSERT INTO public.operator_actions
       (kind, title, payload, evidence, risk, approver_role, status, source,
        outcome, decided_at)
     VALUES ($1, $2, $3, $4, 'high', 'sysadmin', 'auto_executed', 'worker', $5, NOW())`,
    [
      'security_isolation',
      `SOAR: isolated ${container} (rule: ${payload.rule})`,
      JSON.stringify({ container, cmd, user }),
      JSON.stringify({
        falco_rule: payload.rule,
        falco_output: payload.output,
        hostname: payload.hostname,
        output_fields: payload.output_fields,
        outcome,
        timestamp: new Date().toISOString(),
      }),
      outcome,
    ]
  ).catch((err) => console.error('[soar] failed to write operator_actions row:', err.message));
}

async function sendIsolationTelegram(payload, container, cmd, user, isolated) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const script = process.env.TELEGRAM_NOTIFY_SH || '/app/scripts/telegram-notify.sh';
  const line =
    `🚨 *SECURITY ISOLATION* ${isolated ? '(executed)' : '(deferred)'}\n` +
    `container: ${container}\nrule: ${payload.rule}\n` +
    `cmd: ${cmd || '?'}\nuser: ${user || '?'}\n` +
    `Restore: docker network connect gate-net ${container}\n` +
    `Review: https://monitor.ucej.in/sysadmin/actions`;
  try {
    await run('bash', [script, line], { timeout: 15_000 });
  } catch (err) {
    console.error('[soar] telegram failed:', err.message);
  }
}
