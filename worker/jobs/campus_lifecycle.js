// worker/jobs/campus_lifecycle.js
import { getWorkerDbPool } from "../db.js";

/**
 * Auto-expiry + RAG tombstone sweep.
 *
 * Runs every 5 minutes. Transitions operational_announcements:
 *   UPCOMING -> LIVE -> COMPLETED -> ARCHIVED
 * using process_announcement_lifecycles() (SQL function from migration 51).
 * Then tombstones KB chunks whose source document has been archived.
 */
export async function runCampusLifecycleSweep() {
  const pool = getWorkerDbPool();

  // 1. Flip announcement states via the SQL function (atomic, zero app-level if/else).
  await pool.query(`SELECT public.process_announcement_lifecycles()`);

  // 2. Count states for observability.
  const counts = await pool.query(
    `SELECT state, COUNT(*)::int AS n
       FROM public.operational_announcements
      GROUP BY state
      ORDER BY state`,
  );

  // 3. Tombstone KB chunks whose source document is now ARCHIVED.
  const tomb = await pool.query(
    `UPDATE public.institutional_knowledge_chunks
        SET is_tombstoned = TRUE
      WHERE source_document_id IN (
        SELECT id FROM public.operational_announcements WHERE state = 'ARCHIVED'
      )
      AND is_tombstoned = FALSE`,
  );

  return {
    announcementCounts: Object.fromEntries(counts.rows.map((r) => [r.state, r.n])),
    tombstonedChunks: tomb.rowCount ?? 0,
    sweptAt: new Date().toISOString(),
  };
}
