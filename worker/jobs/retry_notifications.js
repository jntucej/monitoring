/**
 * Retry failed notifications (email, SMS, push).
 *
 * Reads notification queues where status = "failed" AND attempts < MAX.
 * Resets status back to "pending" so dispatch_notifications picks them up
 * on the next cycle. Failures are logged per-queue and never crash the
 * worker (runJob wraps this; a per-queue error must not block the other
 * queues).
 *
 * NOTE: The original version imported getDbClient() from src/lib/db.js and
 * used Supabase-style `.from().select()` chaining — that module does not
 * exist in the post-migration codebase and the queue tables have no
 * `next_retry_at` / `updated_at` columns, so the job would have crashed
 * on first use. This rewrite uses the worker's PG pool like every other
 * job and only touches columns that actually exist.
 */

import { query } from '../db.js';

const MAX_ATTEMPTS = 5;

const QUEUES = [
  { name: 'notification_email_queue', log: 'email' },
  { name: 'notification_sms_queue', log: 'sms' },
  { name: 'notification_push_queue', log: 'push' },
];

export default async function retryNotifications() {
  const summary = [];

  for (const q of QUEUES) {
    try {
      // Reset failed rows back to pending so the dispatcher re-attempts
      // them. We do NOT bump attempts here (dispatch_notifications owns
      // the attempts counter on send outcome); bumping it on the *reset*
      // path would double-count and push jobs past MAX_ATTEMPTS faster.
      const { rowCount } = await query(
        `UPDATE ${q.name} SET status = 'pending'
         WHERE status = 'failed' AND attempts < $1`,
        [MAX_ATTEMPTS],
      );
      summary.push({ queue: q.log, requeued: rowCount ?? 0 });
    } catch (err) {
      summary.push({ queue: q.log, error: String(err.message ?? err) });
      console.error(`[retry_notifications] ${q.name} failed:`, err);
    }
  }

  console.log(
    `[retry_notifications] requeued: ${JSON.stringify(summary)}`,
  );
  return { success: true, data: summary };
}
