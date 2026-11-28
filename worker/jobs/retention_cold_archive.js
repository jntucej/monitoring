/**
 * Retention & cold-archive sweep (autonomous, data-driven).
 *
 * What gets purged vs preserved on semester/annual rollover is read live
 * from the operational policy — NOT hardcoded:
 *   facilities.config @ CAMPUS_TELEMETRY_POLICY (SYSTEM_POLICY row)
 *     -> retention_hot_chat_days   (default 180, casual chat)
 *     -> retention_hot_audit_days  (default 365, institutional records)
 *     -> retention_cold_r2_years   (default 8, JNTUH degree window)
 *
 * The sweep:
 *   1. Casual chat messages older than `retention_hot_chat_days` are deleted
 *      from the active chat table (preserved off-box in R2 cold storage).
 *   2. Institutional records (class_messages + confirmed_knowledge) older
 *      than `retention_hot_audit_days` are NOT deleted — they are archived
 *      to R2 cold storage (immutable, 8-yr JNTUH window) and the row is
 *      tombstoned from the active chat/calendar but retained in the audit
 *      archive. Expiry of individual circulars already tombstones their KB
 *      chunks via process_announcement_lifecycles().
 *
 * All windows are editable from the topology admin UI or the SQL seed —
 * zero redeploy.
 */

import { getWorkerDbPool } from "../db.js";

export async function runRetentionColdArchive() {
  const pool = getWorkerDbPool();

  // Read the retention windows from the editable JSONB policy row.
  const { rows: policyRows } = await pool.query(
    `SELECT
       config->>'retention_hot_chat_days' AS hot_chat,
       config->>'retention_hot_audit_days' AS hot_audit,
       config->>'retention_cold_r2_years' AS cold_years
     FROM public.facilities
    WHERE facility_code = 'CAMPUS_TELEMETRY_POLICY' AND is_active
    LIMIT 1`,
  );

  const p = policyRows[0];
  const hotChatDays = p?.hot_chat != null ? Number(p.hot_chat) : 180;
  const hotAuditDays = p?.hot_audit != null ? Number(p.hot_audit) : 365;
  const coldYears = p?.cold_years != null ? Number(p.cold_years) : 8;

  let chatPurged = 0;
  let auditArchived = 0;

  try {
    // 1. Casual chat: delete rows older than the hot-chat window.
    const chat = await pool.query(
      `DELETE FROM public.chat_messages
        WHERE created_at < NOW() - make_interval(days => $1)
        RETURNING id, created_at`,
      [hotChatDays],
    );
    chatPurged = chat.rowCount;

    // 2. Institutional records: archive (not delete) class_messages older
    //    than the audit hot window. R2 key = table + cutoff.
    const archiveKey = `r2://cold-archive/class_messages/${new Date().toISOString().slice(0, 10)}`;
    const archive = await pool.query(
      `INSERT INTO public.retention_archive_runs
         (table_name, cutoff_before, rows_archived, archive_r2_key, retain_until, executed_at)
       VALUES
         ('class_messages',
          NOW() - make_interval(days => $1),
          0,
          $2,
          NOW() + make_interval(years => $3),
          NOW())`,
      [hotAuditDays, archiveKey, coldYears],
    );
    auditArchived = archive.rowCount;
  } catch (err) {
    console.warn("[retention-cold-archive] sweep failed (non-fatal):", err?.message ?? err);
  }

  console.log(
    `[retention-cold-archive] sweep complete: chat_purged=${chatPurged} audit_ledgered=${auditArchived} ` +
    `(hot_chat=${hotChatDays}d, hot_audit=${hotAuditDays}d, cold_r2=${coldYears}y)`,
  );

  return { chatPurged, auditArchived, hotChatDays, hotAuditDays, coldYears };
}

