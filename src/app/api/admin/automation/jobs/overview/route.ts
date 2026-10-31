import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { lastIstDayStrings } from "@/server/policy/dates";

interface JobRun {
  job_id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
}

/** Build last-N day column labels (oldest → newest, "YYYY-MM-DD"). */
function lastNDays(n: number): string[] {
  return lastIstDayStrings(n);
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      // ── job names (REAL: scheduled_jobs, fallback to job_runs) ───
      const jobNames: Record<string, string> = {};
      const fallbackJobIds: string[] = [];
      try {
        const res = await query<{ id: string; name: string | null }>(
          `SELECT id, name FROM scheduled_jobs ORDER BY name`
        );
        for (const r of res.rows) {
          if (r.id) jobNames[r.id] = r.name ?? r.id;
        }
      } catch {
        /* scheduled_jobs missing — fill from job_runs below */
      }

      // ── last 24h runs (REAL: job_runs) ──────────────────────────
      let runs24h: JobRun[] = [];
      let totalRuns24h = 0;
      let success24h = 0;
      let failed24h = 0;
      let dlq = 0;
      const durations: number[] = [];
      try {
        const res = await query<JobRun>(
          `SELECT job_id, LOWER(status) AS status, start_time::text AS start_time, end_time::text AS end_time
             FROM job_runs
            WHERE start_time >= NOW() - INTERVAL '24 hours'
            ORDER BY start_time DESC
            LIMIT 5000`
        );
        runs24h = res.rows;
        totalRuns24h = runs24h.length;
        success24h = runs24h.filter((r) => r.status === "success").length;
        failed24h = runs24h.filter((r) => r.status === "failed").length;
        // dlq proxy: failed runs with no end_time (stuck / in-flight dead job).
        dlq = runs24h.filter(
          (r) => r.status === "failed" && r.end_time == null
        ).length;
        for (const r of runs24h) {
          if (r.start_time && r.end_time) {
            const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
            if (Number.isFinite(ms) && ms >= 0) durations.push(ms);
          }
        }
      } catch {
        /* leave zeros */
      }

      const healthyPct =
        totalRuns24h > 0
          ? Math.round((success24h / totalRuns24h) * 100)
          : 100;
      const avgDurationMs =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

      // ── last 14-day matrix (REAL: job_runs) ─────────────────────
      const cols = lastNDays(14);
      let runs14d: JobRun[] = [];
      try {
        const res = await query<JobRun>(
          `SELECT job_id, LOWER(status) AS status, start_time::text AS start_time, end_time::text AS end_time
             FROM job_runs
            WHERE start_time >= NOW() - INTERVAL '14 days'
            ORDER BY start_time DESC
            LIMIT 5000`
        );
        runs14d = res.rows;
      } catch {
        /* leave empty */
      }

      // Fallback: if scheduled_jobs was empty/missing, build rows from job_runs.
      if (Object.keys(jobNames).length === 0) {
        const seen = new Set<string>();
        for (const r of runs14d) {
          if (!seen.has(r.job_id)) {
            seen.add(r.job_id);
            fallbackJobIds.push(r.job_id);
            jobNames[r.job_id] = r.job_id;
          }
        }
      }

      // Group runs by job_id × day (per-day total + success counts).
      const dayIndex = new Map(cols.map((d, i) => [d, i]));
      const perJobDay = new Map<string, Map<number, { total: number; success: number }>>();
      for (const r of runs14d) {
        const day = (r.start_time ?? "").slice(0, 10);
        const ci = dayIndex.get(day);
        if (ci == null) continue;
        let jobMap = perJobDay.get(r.job_id);
        if (!jobMap) {
          jobMap = new Map<number, { total: number; success: number }>();
          perJobDay.set(r.job_id, jobMap);
        }
        const e = jobMap.get(ci) ?? { total: 0, success: 0 };
        e.total += 1;
        if (r.status === "success") e.success += 1;
        jobMap.set(ci, e);
      }

      // Row ids: scheduled_jobs ids when present, else the job_ids we saw in runs.
      const rowIds =
        Object.keys(jobNames).length > 0
          ? Object.keys(jobNames)
          : fallbackJobIds;

      // Build data[][] with green/amber/red semantics:
      //   2 = day has runs and all success (green)
      //   1 = day has runs and at least one failure (amber)
      //   0 = no runs on that day (red / empty)
      // -1  = job has no runs at all in the 14-day window (row "missing")
      const data: number[][] = rowIds.map((jid) => {
        const jobMap = perJobDay.get(jid);
        if (!jobMap || jobMap.size === 0) {
          return new Array(cols.length).fill(-1);
        }
        const row = new Array(cols.length).fill(0);
        for (let i = 0; i < cols.length; i++) {
          const e = jobMap.get(i);
          if (e && e.total > 0) row[i] = e.success === e.total ? 2 : 1;
        }
        return row;
      });

      const runsMatrix = {
        rows: rowIds.map((jid) => jobNames[jid] ?? jid),
        cols,
        data,
      };

      return ok({
        healthy_pct: healthyPct,
        failed_24h: failed24h,
        avg_duration_ms: avgDurationMs,
        dlq,
        runs_matrix: runsMatrix,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
