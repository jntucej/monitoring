// worker/jobs/feed_expire.js
import { getWorkerDbPool } from "../db.js";

export async function runFeedExpire() {
  const pool = getWorkerDbPool();
  const res = await pool.query(
    `UPDATE public.campus_feed_items
        SET status = 'expired'
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()`,
  );
  return { expired: res.rowCount ?? 0 };
}
