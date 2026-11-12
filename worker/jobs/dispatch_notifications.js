// worker/jobs/dispatch_notifications.js
//
// SINGLE OWNER of notification_sms_queue, notification_email_queue, and
// notification_push_queue.
//
// Fix (2026-11 correctness): previously three jobs drained the same queues
// in one tick (send_sms.js, send_emails.js, and this job), which without an
// atomic claim could double-send a message or race on row state. This job is
// now the only one that claims and dispatches. send_sms.js and send_emails.js
// have been deleted.
//
// Claim semantics:
//   - Atomic UPDATE ... RETURNING wrapping a SELECT FOR UPDATE SKIP LOCKED
//     so a concurrent claimant can never grab the same row twice.
//   - SMS claims by priority_rank (1=otp, 2=urgent, 3=normal), then
//     next_attempt_at, then created_at.
//   - Email claims by priority_rank, then created_at.
//
// Uses the worker's own PG pool (../db.js) — the same pattern as every other
// job. The previous import of ../../src/lib/dbClient.js failed at runtime
// because the Next standalone build does not ship a standalone
// src/lib/dbClient.js file.
import { query } from '../db.js';
import { sendSms } from '../lib/sms-provider.js';
import { createTransport } from 'nodemailer';

// ── Configuration ──────────────────────────────────────────────────────────
const SMS_BATCH = 20;
const EMAIL_BATCH = 50;
const SMS_MAX_ATTEMPTS = 5;
const EMAIL_MAX_ATTEMPTS = 5;
const SMS_SLEEP_MS = 100; // MSG91 allows ~10 SMS/sec; space calls to stay under

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function smsConfig() {
  return {
    enabled: process.env.SMS_ENABLED === 'true',
    accountSid: process.env.TWILIO_ACCOUNT_SID || process.env.SMS_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || process.env.SMS_AUTH_TOKEN || '',
    from: process.env.TWILIO_FROM_NUMBER || process.env.SMS_FROM || '',
  };
}

// ── Atomic claim helpers ───────────────────────────────────────────────────
// Claim a batch of SMS rows atomically. The UPDATE ... RETURNING wraps the
// SELECT in the same statement, so FOR UPDATE SKIP LOCKED prevents a second
// claimant from grabbing the same rows in the same tick.
async function claimSmsBatch(limit = SMS_BATCH) {
  const { rows } = await query(
    `UPDATE notification_sms_queue q
        SET status = 'processing',
            processing_started_at = NOW(),
            attempts = q.attempts + 1
      WHERE q.id IN (
        SELECT id FROM notification_sms_queue
         WHERE status IN ('pending','failed')
           AND next_attempt_at <= NOW()
           AND attempts < $1
         ORDER BY priority_rank, next_attempt_at, created_at
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING q.*`,
    [SMS_MAX_ATTEMPTS, limit]
  );
  return rows;
}

async function claimEmailBatch(limit = EMAIL_BATCH) {
  const { rows } = await query(
    `UPDATE notification_email_queue q
        SET status = 'processing',
            processing_started_at = NOW(),
            attempts = q.attempts + 1
      WHERE q.id IN (
        SELECT id FROM notification_email_queue
         WHERE status IN ('pending','failed')
           AND attempts < $1
         ORDER BY COALESCE(q.priority_rank, 3), q.created_at
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING q.*`,
    [EMAIL_MAX_ATTEMPTS, limit]
  );
  return rows;
}

// ── SMS dispatch ────────────────────────────────────────────────────────────

async function markSmsSent(id, providerId, costInr) {
  await query(
    `UPDATE notification_sms_queue
        SET status = 'sent',
            sent_at = NOW(),
            provider_message_id = $1,
            cost_inr = $2,
            error = NULL
      WHERE id = $3`,
    [providerId, costInr ?? null, id]
  );
}

async function markSmsFailed(id, attempts, errorMsg, permanent) {
  const nextStatus = permanent || attempts >= SMS_MAX_ATTEMPTS ? 'dead_letter' : 'failed';
  const backoffMin = Math.min(60, Math.pow(2, Math.max(0, attempts - 1)));
  await query(
    `UPDATE notification_sms_queue
        SET status = $1,
            error = $2,
            failed_at = NOW(),
            next_attempt_at = NOW() + ($3 || ' minutes')::interval
      WHERE id = $4`,
    [nextStatus, String(errorMsg).slice(0, 500), String(backoffMin), id]
  );
}

async function handleSmsQueue() {
  const cfg = smsConfig();

  // Provider not configured: claim nothing, log loudly. A silent no-op was
  // how a missing SMS provider hid itself for months.
  if (!cfg.enabled) {
    const { rows } = await query(
      `SELECT count(*) AS n FROM notification_sms_queue WHERE status IN ('pending','failed')`
    );
    const n = Number(rows[0]?.n ?? 0);
    if (n > 0) {
      console.warn(
        `[dispatch] sms: ${n} pending/failed but SMS_ENABLED is not 'true'. ` +
        `Set SMS_ENABLED=true + SMS_PROVIDER/SMS_ACCOUNT_SID/SMS_AUTH_TOKEN/SMS_FROM to start delivering.`
      );
    }
    return { sent: 0, failed: 0, dead: 0 };
  }
  if (!cfg.accountSid || !cfg.authToken || !cfg.from) {
    console.warn(
      `[dispatch] sms: SMS_ENABLED=true but provider credentials incomplete ` +
      `(need SMS_ACCOUNT_SID / SMS_AUTH_TOKEN / SMS_FROM) — leaving rows pending.`
    );
    return { sent: 0, failed: 0, dead: 0 };
  }

  let sent = 0, failed = 0, dead = 0;

  while (true) {
    const batch = await claimSmsBatch();
    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        const result = await sendSms(row);
        if (result.ok) {
          await markSmsSent(row.id, result.providerId ?? '', result.costInr);
          sent++;
        } else {
          const permanent = Boolean(result.permanent) || Number(row.attempts) >= SMS_MAX_ATTEMPTS;
          await markSmsFailed(row.id, Number(row.attempts), result.error ?? 'unknown', permanent);
          if (permanent) dead++; else failed++;
        }
      } catch (err) {
        await markSmsFailed(row.id, Number(row.attempts), String(err), false);
        failed++;
      }
      await sleep(SMS_SLEEP_MS);
    }

    if (batch.length < SMS_BATCH) break;
  }

  if (sent || failed || dead) {
    console.log(`[dispatch] sms: sent=${sent} retry=${failed} dead=${dead}`);
  }
  return { sent, failed, dead };
}

// ── Email dispatch ─────────────────────────────────────────────────────────

async function markEmailSent(id, messageId) {
  await query(
    `UPDATE notification_email_queue
        SET status = 'sent', sent_at = NOW(), provider_message_id = $2, error = NULL
      WHERE id = $1`,
    [id, messageId]
  );
}

async function markEmailFailed(id, attempts, error) {
  const nextStatus = attempts >= EMAIL_MAX_ATTEMPTS ? 'dead_letter' : 'failed';
  await query(
    `UPDATE notification_email_queue
        SET status = $1, error = $2, failed_at = NOW()
      WHERE id = $3`,
    [nextStatus, String(error).slice(0, 500), id]
  );
}

let cachedTransporter = null;
function getEmailTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_LOGIN;
  const pass = process.env.BREVO_SMTP_KEY;

  if (!user || !pass) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BREVO_SMTP_LOGIN or BREVO_SMTP_KEY missing in production');
    }
    cachedTransporter = {
      sendMail: async (opts) => {
        console.log(`[dispatch] email (dev): To: ${opts.to}, Subject: ${opts.subject}`);
        return { messageId: `dev-${Date.now()}` };
      },
    };
    return cachedTransporter;
  }

  cachedTransporter = createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 30_000,
  });
  return cachedTransporter;
}

async function handleEmailQueue() {
  const sentToday = Number(
    (await query(
      `SELECT COUNT(*) AS n FROM notification_email_queue WHERE status='sent' AND sent_at >= CURRENT_DATE`
    )).rows[0]?.n ?? 0
  );
  const DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT || 300);
  const remaining = DAILY_LIMIT - sentToday;

  if (remaining <= 0) {
    console.log(`[dispatch] email: daily limit reached (${DAILY_LIMIT}). Skipping.`);
    return { sent: 0, failed: 0 };
  }

  const limit = Math.min(EMAIL_BATCH, remaining);
  const batch = await claimEmailBatch(limit);
  if (batch.length === 0) return { sent: 0, failed: 0 };

  let transporter;
  try {
    transporter = getEmailTransporter();
  } catch (err) {
    for (const row of batch) {
      await markEmailFailed(row.id, Number(row.attempts ?? 0), String(err));
    }
    console.error(`[dispatch] email: transporter init failed, ${batch.length} row(s) marked failed:`, err.message);
    return { sent: 0, failed: batch.length };
  }

  let sent = 0, failed = 0;
  for (const email of batch) {
    try {
      const info = await transporter.sendMail({
        from: `Campus Access <${process.env.BREVO_SMTP_FROM || 'noreply@ucej.in'}>`,
        to: email.email,
        subject: email.subject,
        text: email.body,
        html: email.html || email.body,
        headers: { 'X-Category': email.category || 'generic' },
      });
      await markEmailSent(email.id, info.messageId);
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markEmailFailed(email.id, Number(email.attempts ?? 0), msg);
      failed++;
      console.error(`[dispatch] email failed ${email.id}:`, msg);
    }
    if (sent >= remaining) break;
  }
  if (sent || failed) console.log(`[dispatch] email: sent=${sent} failed=${failed}`);
  return { sent, failed };
}

// ── Push queue ─────────────────────────────────────────────────────────────
// No web-push SDK (VAPID + service-worker subscriptions) is wired in this
// repo. The queue is drained with a logged status update so the operator can
// see it is intentionally held, not silently dropped.
async function handlePushQueue() {
  const { rows } = await query(
    `SELECT count(*) AS n FROM notification_push_queue WHERE status = 'pending'`
  );
  const n = Number(rows[0]?.n ?? 0);
  if (n === 0) return;
  console.warn(`[dispatch] push: ${n} pending held — web-push SDK not configured.`);
}

// ── Queue depth gauge (Prometheus) ─────────────────────────────────────────
// Expose per-queue depth so a stalled dispatcher is visible before users
// complain. The worker's /metrics endpoint calls this every scrape.
export async function getQueueDepths() {
  const depths = {};
  for (const table of ['notification_sms_queue', 'notification_email_queue', 'notification_push_queue']) {
    const { rows } = await query(
      `SELECT status, COUNT(*)::int AS n
         FROM ${table}
        WHERE status IN ('pending','processing','failed')
        GROUP BY status`
    ).catch(() => ({ rows: [] }));
    depths[table] = rows.reduce((acc, r) => {
      acc[r.status] = Number(r.n);
      return acc;
    }, {});
  }
  return depths;
}

// ── Main entry ─────────────────────────────────────────────────────────────
export default async function dispatchNotifications() {
  console.log('[dispatch] notification dispatch starting...');
  const sms = await handleSmsQueue();
  const email = await handleEmailQueue();
  await handlePushQueue();
  console.log('[dispatch] notification dispatch complete.');
  return { success: true, data: { sms, email } };
}
