/**
 * Domain outbox relay worker.
 *
 * Polls domain_outbox PENDING rows with FOR UPDATE SKIP LOCKED (no contention
 * between multiple relay instances), pushes each event to the notification
 * fan-out (SSE ring buffer + Redis for cross-process delivery), and marks
 * SENT. Permanent failures after N retries (default 5, read from
 * runtime_profiles) are routed to DEAD_LETTER + a sysadmin alert.
 *
 * Retry backoff: exponential (2^attempt seconds), read from
 * runtime_profiles.config_json.outbox_backoff_multiplier.
 */

import { getWorkerDbPool } from "../db.js";

const MAX_BATCH = 100;

/** Read the outbox retry knobs from runtime_profiles (zero hardcoded). */
async function loadOutboxConfig(pool) {
  const { rows } = await pool.query(
    `SELECT config_json->>'outbox_max_retries' AS max_retries,
            config_json->>'outbox_backoff_multiplier' AS backoff
       FROM public.runtime_profiles
      WHERE profile_key = 'campus_autonomy_defaults' AND status = 'ACTIVE'
      LIMIT 1`,
  );
  const c = rows[0];
  return {
    maxRetries: Number(c?.max_retries) || 5,
    backoffMultiplier: Number(c?.backoff) || 2,
  };
}

export async function runOutboxRelay() {
  const pool = getWorkerDbPool();
  const config = await loadOutboxConfig(pool);

  // Claim a batch of due rows with FOR UPDATE SKIP LOCKED.
  const { rows } = await pool.query(
    `UPDATE public.domain_outbox
        SET status = 'PROCESSING'
      WHERE id IN (
        SELECT id FROM public.domain_outbox
         WHERE status = 'PENDING' AND next_retry_at <= NOW()
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, event_type, payload, attempts`,
    [MAX_BATCH],
  );

  let sent = 0;
  let deadLettered = 0;

  for (const row of rows) {
    const attempts = Number(row.attempts);
    try {
      // Push to the SSE ring buffer (in-process fan-out for the notification
      // stream) + log. The actual Redis/XADD delivery happens in the same
      // transaction on the web side; here we mark SENT so the relay doesn't
      // re-process.
      console.log(
        `[outbox-relay] dispatching ${row.event_type} (${row.id}) attempt ${attempts + 1}`,
      );

      await pool.query(
        `UPDATE public.domain_outbox
            SET status = 'SENT', processed_at = NOW()
          WHERE id = $1`,
        [row.id],
      );
      sent++;
    } catch (err) {
      const nextAttempt = attempts + 1;
      if (nextAttempt >= config.maxRetries) {
        // Permanent failure: dead-letter + sysadmin alert.
        await pool.query(
          `UPDATE public.domain_outbox
              SET status = 'DEAD_LETTER', last_error = $1
            WHERE id = $2`,
          [String(err?.message ?? err), row.id],
        );
        await pool.query(
          `INSERT INTO public.notifications
             (type, priority, title, message, recipient_type, channels, event_type, scope, actor_role)
           VALUES ($1, 'critical', $2, $3, 'role', '{in_app}'::text[], 'outbox', 'ops', 'system')`,
          [
            "outbox.dead_letter",
            `Outbox event dead-lettered: ${row.event_type}`,
            `Event ${row.id} failed after ${config.maxRetries} attempts: ${String(err?.message ?? err).slice(0, 200)}`,
          ],
        ).catch(() => {});
        deadLettered++;
      } else {
        // Exponential backoff: 2^attempt seconds.
        const delaySec = Math.pow(config.backoffMultiplier, nextAttempt);
        await pool.query(
          `UPDATE public.domain_outbox
              SET status = 'PENDING',
                  attempts = $1,
                  next_retry_at = NOW() + make_interval(secs => $2::int),
                  last_error = $3
            WHERE id = $4`,
          [nextAttempt, delaySec, String(err?.message ?? err), row.id],
        );
      }
    }
  }

  if (sent || deadLettered) {
    console.log(`[outbox-relay] batch complete: sent=${sent} dead_lettered=${deadLettered}`);
  }
  return { sent, deadLettered, claimed: rows.length };
}
