/**
 * Drain notification_sms_queue with FOR UPDATE SKIP LOCKED.
 * Retry with exponential backoff; dead_letter after 5 attempts.
 *
 * Rate limit: MSG91 allows ~10 SMS/sec per auth key; we batch 20/claim and
 * space calls by 100 ms to stay under. Twilio's default tier is 1/sec.
 *
 * Email dispatch is owned by send_emails.js (Brevo SMTP) — do NOT claim
 * 'sent' here for email rows. This job only drains the SMS queue.
 */
import { query } from '../db.js';
import { sendSms } from '../lib/sms-provider.js';

const BATCH = 20;
const MAX_ATTEMPTS = 5;
const SLEEP_MS = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function claimBatch() {
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
        ORDER BY
          CASE priority WHEN 'otp' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
          next_attempt_at,
          created_at
        LIMIT $2
        FOR UPDATE SKIP LOCKED
     )
     RETURNING q.*`,
    [MAX_ATTEMPTS, BATCH]
  );
  return rows;
}

async function markSent(id, providerId, costInr) {
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

async function markFailed(id, attempts, errorMsg, permanent) {
  const nextStatus =
    permanent || attempts >= MAX_ATTEMPTS ? 'dead_letter' : 'failed';
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

export default async function sendSmsQueue() {
  let sent = 0;
  let failed = 0;
  let dead = 0;

  while (true) {
    const batch = await claimBatch();
    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        const result = await sendSms(row);
        if (result.ok) {
          await markSent(row.id, result.providerId ?? '', result.costInr);
          sent++;
        } else {
          const permanent = Boolean(result.permanent) || row.attempts >= MAX_ATTEMPTS;
          await markFailed(row.id, row.attempts, result.error ?? 'unknown', permanent);
          if (permanent) dead++;
          else failed++;
        }
      } catch (err) {
        await markFailed(row.id, row.attempts, String(err), false);
        failed++;
      }
      await sleep(SLEEP_MS);
    }

    if (batch.length < BATCH) break;
  }

  if (sent || failed || dead) {
    console.log(`[sms] sent=${sent} retry=${failed} dead=${dead}`);
  }
}
