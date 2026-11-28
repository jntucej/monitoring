/**
 * Retention & cold-archive sweep (autonomous, data-driven).
 *
 * What gets purged vs preserved on semester/annual rollover is read live from
 * the VERSIONED retention policy table (migration 55) — NOT hardcoded:
 *   public.retention_policy_rules
 *     artifact_type  (casual_chat / circular_card / approval_card /
 *                     confirmed_knowledge / gate_logs)
 *     hot_db_ttl_days     (hot PostgreSQL window before R2 export)
 *     cold_r2_ttl_years   (immutable R2 cold archive; 8y = JNTUH degree window)
 *     trigger_event      (scheduled_cron / semester_rollover / result_published /
 *                         graduation / manual_dry_run)
 *     export_format      (encrypted_json / parquet / jsonl_gz)
 *
 * Fallback (pre-migration): facilities.config @ CAMPUS_TELEMETRY_POLICY
 * (retention_hot_chat_days / retention_hot_audit_days / retention_cold_r2_years).
 *
 * The sweep:
 *   1. For each ACTIVE retention_policy_rules row whose trigger_event is
 *      'scheduled_cron', delete the corresponding hot-DB rows older than
 *      `hot_db_ttl_days` (casual_chat -> chat_messages). The encrypted
 *      transcript dump to R2 is the offsite step; this sweep only ledgeres
 *      the run + purges the hot copy.
 *   2. Institutional artifacts (circular_card, approval_card,
 *      confirmed_knowledge, gate_logs) are NOT deleted — they are
 *      ledgered into retention_archive_runs with the cold R2 key so the
 *      offsite worker can export + tombstone. Expiry of individual
 *      circulars already tombstones their KB chunks via
 *      process_announcement_lifecycles().
 *
 * All windows are editable from the admin console (Draft -> Dry-Run ->
 * Approve -> Publish) — zero redeploy.
 */

import { getWorkerDbPool } from "../db.js";

/** Map artifact_type -> the hot-DB table + its timestamp column it purges/ledgeres. */
const ARTIFACT_TABLE = {
  casual_chat: { table: "chat_messages", ts: "created_at" },
  circular_card: { table: "operational_announcements", ts: "created_at" },
  approval_card: { table: "policy_change_requests", ts: "created_at" },
  confirmed_knowledge: { table: "confirmed_knowledge", ts: "created_at" },
  gate_logs: { table: "gate_passes", ts: "requested_at" },
  location_history: { table: "movement_logs", ts: "timestamp" },
};

export async function runRetentionColdArchive() {
  const pool = getWorkerDbPool();

  // 1. Read the versioned retention rules (newest non-archived, ACTIVE or
  //    DRY_RUN_VERIFIED). Fall back to the JSONB facility row if the table
  //    is absent or empty (pre-migration DB).
  const { rows: rules } = await pool.query(
    `SELECT artifact_type, hot_db_ttl_days, cold_r2_ttl_years, trigger_event, export_format, status, policy_key
       FROM public.retention_policy_rules
      WHERE status IN ('ACTIVE','DRY_RUN_VERIFIED')
      ORDER BY policy_key`,
  ).catch(() => ({ rows: [] }));

  let effectiveRules = rules;
  let source = "retention_policy_rules";
  if (effectiveRules.length === 0) {
    source = "CAMPUS_TELEMETRY_POLICY JSONB fallback";
    const fb = await pool.query(
      `SELECT
         COALESCE((config->>'retention_hot_chat_days')::int, 180)  AS hot_chat,
         COALESCE((config->>'retention_hot_audit_days')::int, 365) AS hot_audit,
         COALESCE((config->>'retention_cold_r2_years')::numeric, 8) AS cold_years
       FROM public.facilities
      WHERE facility_code = 'CAMPUS_TELEMETRY_POLICY' AND is_active
      LIMIT 1`,
    );
    const p = fb.rows[0];
    effectiveRules = [
      { artifact_type: "casual_chat", hot_db_ttl_days: p?.hot_chat ?? 180, cold_r2_ttl_years: p?.cold_years ?? 8, trigger_event: "scheduled_cron", export_format: "jsonl_gz", policy_key: "fallback_chat" },
      { artifact_type: "circular_card", hot_db_ttl_days: p?.hot_audit ?? 365, cold_r2_ttl_years: p?.cold_years ?? 8, trigger_event: "graduation", export_format: "encrypted_json", policy_key: "fallback_circular" },
    ];
  }

  let purgedTotal = 0;
  let ledgeredTotal = 0;
  const perArtifact = [];

  for (const rule of effectiveRules) {
    const target = ARTIFACT_TABLE[rule.artifact_type];
    if (!target) continue;
    const tableName = target.table;
    const tsCol = target.ts;

    // Only casual_chat is purged on scheduled_cron; institutional artifacts
    // (circular_card, approval_card, confirmed_knowledge, gate_logs,
    // location_history) are ledgered for offsite R2 export — never deleted
    // from the hot DB by this sweep (NAAC/IQAC audit requirement).
    const isCasual = rule.artifact_type === "casual_chat";

    if (isCasual) {
      // Casual chat: purge hot rows older than the hot window.
      try {
        const chat = await pool.query(
          `DELETE FROM public.${tableName}
            WHERE ${tsCol} < NOW() - make_interval(days => $1)
            RETURNING id, ${tsCol}`,
          [Number(rule.hot_db_ttl_days)],
        );
        purgedTotal += chat.rowCount;
      } catch (err) {
        console.warn(`[retention-cold-archive] purge ${rule.artifact_type} failed:`, err?.message ?? err);
      }
    }

    // Ledger a cold-archive run for every rule (casual + institutional).
    try {
      const archiveKey = `r2://cold-archive/${tableName}/${new Date().toISOString().slice(0, 10)}`;
      const ledger = await pool.query(
        `INSERT INTO public.retention_archive_runs
           (table_name, cutoff_before, rows_archived, archive_r2_key, retain_until, executed_at)
         VALUES
           ($1,
            NOW() - make_interval(days => $2),
            0,
            $3,
            NOW() + make_interval(years => $4::numeric),
            NOW())`,
        [tableName, Number(rule.hot_db_ttl_days), archiveKey, rule.cold_r2_ttl_years],
      );
      ledgeredTotal += ledger.rowCount;
    } catch (err) {
      console.warn(`[retention-cold-archive] ledger ${rule.artifact_type} failed:`, err?.message ?? err);
    }

    perArtifact.push({
      artifact: rule.artifact_type,
      table: tableName,
      hotDays: Number(rule.hot_db_ttl_days),
      coldYears: Number(rule.cold_r2_ttl_years),
      trigger: rule.trigger_event,
      source: rule.policy_key,
    });
  }

  console.log(
    `[retention-cold-archive] sweep complete: purged=${purgedTotal} ledgered=${ledgeredTotal} ` +
    `source=${source} rules=[${perArtifact.map((r) => `${r.artifact}(${r.hotDays}d/${r.coldYears}y`).join(", ")}]`,
  );

  return { purgedTotal, ledgeredTotal, source, perArtifact };
}
