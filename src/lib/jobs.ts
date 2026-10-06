/**
 * Real implementations for manually-triggerable background jobs.
 * Each handler performs actual DB work and returns rows affected.
 */

import { getSupabaseServiceClient } from "./dbClient";

export interface JobExecutionResult {
  recordsAffected: number;
  details: string;
}

type JobHandler = () => Promise<JobExecutionResult>;

const backfillDailyStats: JobHandler = async () => {
  const supabase = getSupabaseServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // Aggregate today's movement per gate directly in Postgres.
  const { data, error } = await supabase.rpc("backfill_daily_stats_for_date", { target_date: today });
  if (error) {
    // ponytail: until the RPC below exists, fall back to an exact-count write
    // via per-gate upserts — acceptable at campus scale (< few hundred gates).
    const { data: logs, error: logErr } = await supabase
      .from("movement_logs")
      .select("gate_id, gate_name, direction")
      .gte("timestamp", `${today}T00:00:00Z`);
    if (logErr) throw new Error(logErr.message);
    const byGate = new Map<string, { gate_name: string; entries: number; exits: number }>();
    for (const l of logs || []) {
      const g = byGate.get(l.gate_id) || { gate_name: l.gate_name, entries: 0, exits: 0 };
      if (l.direction === "IN") g.entries += 1; else g.exits += 1;
      byGate.set(l.gate_id, g);
    }
    let affected = 0;
    for (const [gateId, agg] of byGate) {
      const { error: upErr } = await supabase.from("daily_stats").upsert(
        { date: today, gate_id: gateId, gate_code: null, entries: agg.entries, exits: agg.exits },
        { onConflict: "date,gate_id" }
      );
      if (upErr) throw new Error(upErr.message);
      affected += agg.entries + agg.exits;
    }
    return { recordsAffected: affected, details: `Aggregated ${(logs || []).length} movements across ${byGate.size} gates for ${today}` };
  }
  return { recordsAffected: Number(data ?? 0), details: `RPC aggregation completed for ${today}` };
};

const cleanupExpiredPasses: JobHandler = async () => {
  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();

  // Update returns the affected rows; their count IS records affected.
  const { data, error } = await supabase
    .from("gate_passes")
    .update({ final_status: "COMPLETED" })
    .lt("to_datetime", now)
    .eq("final_status", "APPROVED")
    .select("id");

  if (error) throw new Error(error.message);
  const affected = Array.isArray(data) ? data.length : 0;
  return { recordsAffected: affected, details: `Marked ${affected} expired outpasses as COMPLETED` };
};

const auditLogRotationReport: JobHandler = async () => {
  // Archive partitioning lives in Postgres land; here we report volume honestly.
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase.from("audit_logs").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { recordsAffected: count ?? 0, details: `audit_logs currently holds ${count ?? 0} rows (report only)` };
};

const JOB_HANDLERS: Record<string, JobHandler> = {
  backfill_daily_stats: backfillDailyStats,
  cleanup_expired_passes: cleanupExpiredPasses,
  audit_log_rotation: auditLogRotationReport,
};

export function hasRealImplementation(jobId: string): boolean {
  return Boolean(JOB_HANDLERS[jobId]);
}

export async function executeJob(jobId: string): Promise<JobExecutionResult> {
  const handler = JOB_HANDLERS[jobId];
  if (!handler) {
    throw new Error(`No implementation registered for job '${jobId}'`);
  }
  return handler();
}
