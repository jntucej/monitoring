// src/app/api/admin/jobs/overview/route.ts
// GET /api/admin/jobs/overview
// Jobs KPIs + a 14-day job × status matrix.
//
// Tables (confirmed against database/schema.sql):
//   scheduled_jobs     — id, name, enabled, last_run, next_run
//   job_runs           — job_id, status ('success'|'failed'|'running'|'pending'),
//                        start_time, end_time, records_affected, error_message
//
// Real vs stubbed:
//   healthy_pct       — REAL: % of runs in last 24h with status='success'
//   failed_24h        — REAL: count of runs with status='failed' in last 24h
//   avg_duration_ms   — REAL: mean of (end_time - start_time) in ms over last
//     24h (when the columns are present; 0 otherwise). Note: job_runs has NO
//     duration_ms column; we derive it from start_time/end_time.
//   dlq               — REAL proxy: count of 'failed' runs whose end_time IS
//     NULL within 24h (a stuck/in-flight job) OR error_message IS NOT NULL
//     (explicit dead-letter).
//   runs_matrix       — REAL: 14-day job × status matrix. data[r][c] = 0 =
//     all-sentinel / no runs, 1 = mix, 2 = all-success on that day; -1 when
//     no data. rows = scheduled_jobs.name (or job_ids from job_runs when
//     scheduled_jobs is empty/missing), cols = last 14 day labels.
//
// admin-scoped: requiredRole ['sysadmin','admin'].

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
  // IST-boundary-safe: UTC slice(0,10) returns yesterday's day in the
  // 00:00-05:30 IST window, shifting the whole jobs overview.
  return lastIstDayStrings(n);
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      // ── job names (REAL: scheduled_jobs, fallback to job_runs) ───
      const jobNames: Record<string, string> = {};
      const fallbackJobIds: string[] = [];
      try {
        const res = await query(
          `SELECT id, name FROM scheduled_jobs ORDER BY name`
        );
        for (const r of res.rows as Array<{ id: string; name: string | null }>) {
          if (r.id) jobNames[r.id] = r.name ?? r.id;
        }
      } catch { /* scheduled_jobs missing — fill from job_runs below */ }

      // ── last 24h runs (REAL: job_runs) ──────────────────────────
      let runs24h: JobRun[] = [];
      let totalRuns24h = 0;
      let success24h = 0;
      let failed24h = 0;
      let dlq = 0;
      const durations: number[] = [];
      try {
        const res = await query<JobRun>(
          `SELECT job_id, status, start_time::text AS start_time, end_time::text AS end_time
             FROM job_runs
            WHERE start_time >= NOW() - INTERVAL '24 hours'
            ORDER BY start_time DESC
            LIMIT 5000`
        );
        runs24h = res.rows as JobRun[];
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
      } catch { /* leave zeros */ }

      const healthyPct = totalRuns24h > 0
        ? Math.round((success24h / totalRuns24h) * 100)
        : 100;
      const avgDurationMs = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      // ── last 14-day matrix (REAL: job_runs) ─────────────────────
      const cols = lastNDays(14);
      let runs14d: JobRun[] = [];
      try {
        const res = await query<JobRun>(
          `SELECT job_id, status, start_time::text AS start_time, end_time::text AS end_time
             FROM job_runs
            WHERE start_time >= NOW() - INTERVAL '14 days'
            ORDER BY start_time DESC
            LIMIT 5000`
        );
        runs14d = res.rows as JobRun[];
      } catch { /* leave empty */ }

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
      const rowIds = Object.keys(jobNames).length > 0
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
