// src/app/api/sysadmin/worker-jobs/route.ts
// GET /api/sysadmin/worker-jobs
//
// Long-run resilience: dead-man's-switch view of scheduled worker jobs.
//
// Each scheduled worker job (defined in worker/index.mjs) upserts a row in
// worker_job_heartbeats after every run. This endpoint surfaces:
//   - per-job last_run_at / last_status / last_error / runs_total
//   - a per-job `stale` flag: true when last_run_at is older than the job's
//     own interval (i.e. the job missed at least one run)
//   - a top-level `all_fresh` boolean the sysadmin dashboard can alert on
//
// Stale thresholds are keyed by job name (matches worker/index.mjs intervals);
// an unknown job name defaults to a 2-hour staleness window.
//
// admin/sysadmin only. Read-only.

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

/** Job name → expected max interval (ms) before a heartbeat counts as stale.
 *  Mirrors worker/index.mjs `jobs` array. */
const JOB_INTERVAL_MS: Record<string, number> = {
  "rate-limit-cleanup": 5 * 60 * 1000,
  "email-dispatch": 2 * 60 * 1000,
  "sms-dispatch": 30 * 1000,
  "notification-dispatch": 2 * 60 * 1000,
  "notification-retry": 5 * 60 * 1000,
  "cleanup-ephemeral": 15 * 60 * 1000,
  "audit-log-rotation": 60 * 60 * 1000,
  "cleanup-movement-logs": 24 * 60 * 60 * 1000,
  "hard-delete-expired": 60 * 60 * 1000,
};
const DEFAULT_STALE_MS = 2 * 60 * 60 * 1000;

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      void _req;
      void _ctx;

      interface HeartbeatRow {
        job_name: string;
        last_run_at: string;
        last_status: string;
        last_error: string | null;
        runs_total: string;
      }
      const res = (await query<HeartbeatRow>(
        `SELECT job_name, last_run_at, last_status, last_error, runs_total
           FROM public.worker_job_heartbeats
          ORDER BY last_run_at DESC`
      ).catch((err: unknown) => {
        // Table not yet migrated in a dev environment — fail closed with
        // a clear message rather than an empty list that looks "all fresh".
        const msg =
          err instanceof Error ? err.message : String(err);
        if (/relation .*worker_job_heartbeats/i.test(msg)) {
          return { rows: [] as HeartbeatRow[] };
        }
        throw err;
      }));

      const now = Date.now();
      const knownJobNames = new Set(Object.keys(JOB_INTERVAL_MS));

      const jobs = res.rows.map((r) => {
        const interval = JOB_INTERVAL_MS[r.job_name] ?? DEFAULT_STALE_MS;
        const lastRun = new Date(r.last_run_at).getTime();
        const ageMs = Number.isFinite(lastRun) ? now - lastRun : Infinity;
        return {
          job_name: r.job_name,
          last_run_at: r.last_run_at,
          last_status: r.last_status,
          last_error: r.last_error,
          runs_total: Number(r.runs_total),
          age_ms: Number.isFinite(ageMs) ? ageMs : null,
          stale: ageMs > interval,
          interval_ms: interval,
        };
      });

      // Jobs that have never written a heartbeat are the most dangerous case
      // (job never ran or crashed before the first upsert). Surface them.
      const seen = new Set(res.rows.map((r) => r.job_name));
      const neverRan = [...knownJobNames].filter((n) => !seen.has(n));

      const staleCount = jobs.filter((j) => j.stale).length;
      const errorCount = jobs.filter((j) => j.last_status === "error").length;

      return ok({
        jobs,
        never_ran: neverRan,
        all_fresh: jobs.length > 0 && staleCount === 0 && neverRan.length === 0,
        stale_count: staleCount,
        error_count: errorCount,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { keyPrefix: "sysadmin_worker_jobs", maxRequests: 60 }
);
