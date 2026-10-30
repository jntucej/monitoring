/**
 * Send queued emails via Brevo SMTP (port 587 STARTTLS).
 *
 * Runs every 2 minutes via worker/rate-limit-cleanup.mjs schedule.
 * Daily limit: 300 emails (Brevo free tier). The 301st+ item stays
 * 'pending' until the next UTC day boundary, then retries.
 *
 * Reads BREVO_SMTP_LOGIN / BREVO_SMTP_KEY from env.
 * If missing in production -> throws SERVICE_UNAVAILABLE.
 * In development -> logs instead of sending.
 */

import { createTransport } from 'nodemailer';
import { query } from '../db.js';

const DAILY_LIMIT = 300;
const BATCH_SIZE = 50;

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_LOGIN;
  const pass = process.env.BREVO_SMTP_KEY;

  if (!user || !pass) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BREVO_SMTP_LOGIN or BREVO_SMTP_KEY missing in production');
    }
    // Dev mode: create a mock transporter that logs instead of sending
    cachedTransporter = {
      sendMail: async (opts) => {
        console.log(`[EMAIL Dev Mode] To: ${opts.to}, Subject: ${opts.subject}`);
        console.log(`[EMAIL Dev Mode] Body: ${opts.text || opts.html}`);
        return { messageId: `dev-${Date.now()}-${Math.random().toString(36).slice(2)}` };
      }
    };
    return cachedTransporter;
  }

  cachedTransporter = createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 (STARTTLS)
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 30000,
  });

  return cachedTransporter;
}

async function countSentToday() {
  const { rows } = await query(
    `SELECT COUNT(*) FROM notification_email_queue
     WHERE status = 'sent'
       AND sent_at >= CURRENT_DATE`
  );
  return Number(rows[0]?.count || 0);
}

async function fetchPendingEmails(limit) {
  const { rows } = await query(
    `SELECT id, email, subject, body, html, category
     FROM notification_email_queue
     WHERE status = 'pending'
       AND attempts < 5
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function markProcessing(id) {
  await query(
    `UPDATE notification_email_queue
     SET status = 'processing', processing_started_at = now(), attempts = attempts + 1
     WHERE id = $1`,
    [id]
  );
}

async function markSent(id, providerMessageId) {
  await query(
    `UPDATE notification_email_queue
     SET status = 'sent', sent_at = now(), provider_message_id = $2, error = NULL
     WHERE id = $1`,
    [id, providerMessageId]
  );
}

async function markFailed(id, error) {
  await query(
    `UPDATE notification_email_queue
     SET status = 'failed', error = $2
     WHERE id = $1`,
    [id, error]
  );
}

export default async function sendEmails() {
  const sentToday = await countSentToday();
  const remaining = DAILY_LIMIT - sentToday;

  if (remaining <= 0) {
    console.log(`[send_emails] Daily limit reached (${DAILY_LIMIT}). Skipping.`);
    return { success: true, data: { sent: 0, skipped: 0, reason: 'daily_limit' } };
  }

  const limit = Math.min(BATCH_SIZE, remaining);
  const pending = await fetchPendingEmails(limit);

  if (!pending.length) {
    return { success: true, data: { sent: 0, skipped: 0, reason: 'no_pending' } };
  }

  const transporter = getTransporter();
  let sent = 0;
  let skipped = 0;

  for (const email of pending) {
    if (sent >= remaining) {
      skipped++;
      continue;
    }

    try {
      await markProcessing(email.id);

      const info = await transporter.sendMail({
        from: `Campus Access <${process.env.BREVO_SMTP_FROM || 'noreply@ucej.in'}>`,
        to: email.email,
        subject: email.subject,
        text: email.body,
        html: email.html || email.body,
        headers: {
          'X-Category': email.category || 'generic',
        },
      });

      await markSent(email.id, info.messageId);
      sent++;
      console.log(`[send_emails] Sent ${email.id} → ${info.messageId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[send_emails] Failed ${email.id}:`, msg);
      await markFailed(email.id, msg);
    }
  }

  console.log(`[send_emails] Batch complete: sent=${sent}, skipped=${skipped}, remaining_today=${remaining - sent}`);
  return { success: true, data: { sent, skipped, remainingToday: remaining - sent } };
}