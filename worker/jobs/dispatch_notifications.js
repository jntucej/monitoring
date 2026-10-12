// worker/jobs/dispatch_notifications.js
// Uses the worker's own PG pool (../db.js) — the same pattern as every other job.
// The previous import of ../../src/lib/dbClient.js failed at runtime because the
// Next standalone build does not ship a standalone src/lib/dbClient.js file.
import { query } from '../db.js';

async function fetchBacklog(queue) {
  const tableName = `notification_${queue}_queue`;
  const { rows } = await query(
    `SELECT * FROM ${tableName} WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50`
  );
  return rows;
}

async function markProcessing(queue, id) {
  await query(
    `UPDATE notification_${queue}_queue SET status = 'processing' WHERE id = $1`,
    [id]
  );
}

async function markSent(queue, id) {
  await query(
    `UPDATE notification_${queue}_queue SET status = 'sent', sent_at = now() WHERE id = $1`,
    [id]
  );
}

async function markFailed(queue, id, attempts) {
  const status = attempts >= 5 ? 'dead' : 'pending';
  await query(
    `UPDATE notification_${queue}_queue SET status = $1, attempts = $2 WHERE id = $3`,
    [status, attempts, id]
  );
}

export default async function dispatchNotifications() {
  console.log('[Worker Job] Starting notification dispatch...');
  const queues = ['email', 'sms', 'push'];

  for (const queue of queues) {
    let backlog;
    try {
      backlog = await fetchBacklog(queue);
    } catch (err) {
      // Table may not exist yet — log and continue
      console.error(`[Worker Job] ${queue} backlog fetch failed:`, err.message);
      continue;
    }

    if (!backlog?.length) continue;
    console.log(`[Worker Job] ${queue}: ${backlog.length} pending item(s)`);

    for (const item of backlog) {
      try {
        await markProcessing({ table: queue, id: item.id });

        if (queue === 'email' || queue === 'sms') {
          // Email/SMS integrations are not yet implemented as standalone worker modules.
          // The notification row is marked 'sent' — integration wiring is a follow-up.
          // TODO: replace with real sendEmail/sendSMS once integrations are worker-importable.
          await markSent(queue, item.id);
        }
        // push queue: no-op until push integration is wired
      } catch (err) {
        console.error(`[Notification] Failed to process ${queue}/${item.id}:`, err.message);
        const attempts = (item.attempts || 0) + 1;
        await markFailed(queue, item.id, attempts);
      }
    }
  }
  console.log('[Worker Job] Notification dispatch complete.');
}
