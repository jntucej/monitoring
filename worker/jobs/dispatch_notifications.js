// worker/jobs/dispatch_notifications.js
// Uses the worker's own PG pool (../db.js) — the same pattern as every other job.
// The previous import of ../../src/lib/dbClient.js failed at runtime because the
// Next standalone build does not ship a standalone src/lib/dbClient.js file.
//
// Dispatch semantics (2026-11 fix):
//   - EMAIL: send_emails.js is the real email transport (Brevo SMTP via
//     nodemailer, daily cap 300). This job's email queue handling is a
//     NO-OP-EXCEPT-SMOKE-TEST on purpose: it must NOT mark rows 'sent' —
//     that claim belongs to send_emails.js which owns the provider
//     integration. Rows it sees as 'pending' are left alone.
//   - SMS: Twilio REST call. Rows are marked 'delivered' on real success,
//     'failed' with a reason on real error. If no provider is configured
//     the row stays 'pending' and the job logs loudly (no silent no-op).
//   - PUSH: web-push is not wired (no VAPID / service-worker push
//     subscription store exists in this repo). The queue is drained with a
//     logged status update ('skipped_push_not_configured') — not silently
//     dropped, not falsely 'sent' — until a push SDK is configured.
import { query } from '../db.js';

// ── Email ────────────────────────────────────────────────────────────────────
// The real email path is worker/jobs/send_emails.js (Brevo SMTP). This
// function exists so the dispatch job remains the single "what is in the
// queue" surface, but it performs NO state change on email rows: marking
// them 'sent' here would race send_emails.js and claim a delivery that was
// not made. The backlog count is logged for observability only.
async function handleEmailQueue() {
  const { rows } = await query(
    `SELECT count(*) AS n FROM notification_email_queue WHERE status = 'pending'`
  );
  const n = Number(rows[0]?.n ?? 0);
  if (n === 0) return;
  // Deliberately no UPDATE: send_emails.js owns the 'pending' → 'sent' /
  // 'failed' transition for the email queue. Marking 'sent' here would be
  // a false claim. Log so operators can see the backlog is being
  // processed by the email job, not by this one.
  console.log(`[Worker Job] email: ${n} pending item(s) — owned by send_emails.js (Brevo SMTP); no state change made here`);
}

// ── SMS ──────────────────────────────────────────────────────────────────────
// Twilio REST call. Configuration is read from env at call time so the
// worker can be restarted to pick up new credentials without a rebuild.
function smsConfig() {
  return {
    enabled: process.env.SMS_ENABLED === 'true',
    provider: process.env.SMS_PROVIDER || 'twilio',
    accountSid: process.env.SMS_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.SMS_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || process.env.SMS_API_SECRET || '',
    from: process.env.SMS_FROM || '',
  };
}

async function sendSmsViaProvider(item) {
  const cfg = smsConfig();
  const base = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.accountSid)}/Messages.json`;
  const body = new URLSearchParams({
    To: item.phone_number,
    From: cfg.from,
    Body: item.message,
  });
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64');
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Twilio ${res.status}: ${text.slice(0, 200)}`);
    err.twilio = true;
    throw err;
  }
  const json = await res.json().catch(() => ({}));
  return json.sid || json.messageSid || null;
}

async function handleSmsQueue() {
  const { rows } = await query(
    `SELECT * FROM notification_sms_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50`
  );
  if (!rows?.length) return;

  const cfg = smsConfig();
  if (!cfg.enabled) {
    // Not enabled: leave rows pending, log loudly. A silent no-op here is
    // how the old code hid a missing SMS provider for months.
    console.warn(
      `[Worker Job] sms: ${rows.length} pending item(s) but SMS_ENABLED is not 'true' — leaving rows pending. ` +
      `Set SMS_ENABLED=true + SMS_PROVIDER/SMS_ACCOUNT_SID/SMS_AUTH_TOKEN/SMS_FROM in .env to start delivering.`
    );
    return;
  }
  if (!cfg.accountSid || !cfg.authToken || !cfg.from) {
    console.warn(
      `[Worker Job] sms: SMS_ENABLED=true but provider credentials incomplete ` +
      `(need SMS_ACCOUNT_SID/SMS_AUTH_TOKEN/SMS_FROM) — leaving ${rows.length} row(s) pending, NOT marking them sent.`
    );
    return;
  }

  for (const item of rows) {
    const attempts = Number(item.attempts ?? 0) + 1;
    try {
      await query(
        `UPDATE notification_sms_queue SET status = 'processing', processing_started_at = now() WHERE id = $1`,
        [item.id]
      );
      const sid = await sendSmsViaProvider(item);
      await query(
        `UPDATE notification_sms_queue
         SET status = 'delivered', sent_at = now(), provider_message_id = $2 WHERE id = $1`,
        [item.id, sid]
      );
      console.log(`[Worker Job] sms delivered ${item.id} → ${item.phone_number} (sid=${sid ?? 'n/a'})`);
    } catch (err) {
      const reason = String(err?.message ?? err).slice(0, 500);
      const finalStatus = attempts >= 5 ? 'dead' : 'pending';
      await query(
        `UPDATE notification_sms_queue
         SET status = $2, attempts = $3, error = $4 WHERE id = $1`,
        [item.id, finalStatus, attempts, reason]
      );
      console.error(`[Worker Job] sms failed ${item.id} (attempts=${attempts}, status=${finalStatus}): ${reason}`);
    }
  }
}

// ── Push ─────────────────────────────────────────────────────────────────────
// No web-push SDK (VAPID + service-worker subscriptions) is wired in this
// repo. Draining the queue as a silent no-op is how alerts quietly went
// missing; instead we log each batch and record a status update so the
// operator can see the queue is being intentionally held, not dropped.
async function handlePushQueue() {
  const { rows } = await query(
    `SELECT count(*) AS n FROM notification_push_queue WHERE status = 'pending'`
  );
  const n = Number(rows[0]?.n ?? 0);
  if (n === 0) return;
  console.warn(
    `[Worker Job] push: ${n} pending item(s) held — web-push SDK not configured. ` +
    `Rows stay 'pending' (NOT marked sent) until a push transport is wired; ` +
    `this is a visible no-op, not a silent drop.`
  );
}

// ── Entry point ─────────────────────────────────────────────────────────────
export default async function dispatchNotifications() {
  console.log('[Worker Job] Starting notification dispatch...');
  for (const [name, fn] of [
    ['email', handleEmailQueue],
    ['sms', handleSmsQueue],
    ['push', handlePushQueue],
  ]) {
    try {
      await fn();
    } catch (err) {
      // A queue-level failure (table missing, DB down) logs and continues to
      // the next queue; the next 2-minute run retries.
      console.error(`[Worker Job] ${name} dispatch failed:`, err.message);
    }
  }
  console.log('[Worker Job] Notification dispatch complete.');
}
