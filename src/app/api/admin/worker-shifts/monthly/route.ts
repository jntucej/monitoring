/**
 * GET /api/admin/worker-shifts/monthly
 *
 * Monthly roll-up of worker shifts: hours, overtime, late count,
 * contractor-level summary, last-month compare.
 *
 * Query params:
 *   period     — "this-month" | "last-month" (default "this-month")
 *   contractor — optional contractor name filter
 */

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";

function periodRange(period: string, now = new Date()): { from: string; to: string; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "last-month": {
      const lm = new Date(y, m - 1, 1);
      const ly = lm.getFullYear();
      const lmm = lm.getMonth();
      return {
        from: `${ly}-${String(lmm + 1).padStart(2, "0")}-01`,
        to: new Date(ly, lmm + 1, 0).toISOString().slice(0, 10),
        label: "Last month",
      };
    }
    default:
      return {
        from: `${y}-${String(m + 1).padStart(2, "0")}-01`,
        to: getIstDateString(),
        label: "This month",
      };
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const contractor = sp.get("contractor");
  const { from, to, label } = periodRange(period);

  // Per-worker roll-up (derived from worker_attendance_logs IN/OUT pairs per day)
  const workerWhere = contractor ? "AND COALESCE(w.block_id, 'Unassigned') = $3" : "";
  const workerParams: unknown[] = [from, to];
  if (contractor) workerParams.push(contractor);

  const workerR = await query<{
    worker_id: string;
    worker_name: string;
    contractor: string;
    total_hours: string;
    overtime_hours: string;
    late_count: string;
    shift_count: string;
  }>(
    `WITH daily_shifts AS (
       SELECT w.worker_id,
              COALESCE(w.block_id, 'Unassigned') AS contractor,
              (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date AS shift_date,
              MIN(w.logged_at) FILTER (WHERE w.direction = 'IN') AS time_in,
              MAX(w.logged_at) FILTER (WHERE w.direction = 'OUT') AS time_out
         FROM public.worker_attendance_logs w
        WHERE (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
          AND (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date <= $2::date
          ${workerWhere}
        GROUP BY w.worker_id, COALESCE(w.block_id, 'Unassigned'), (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date
     ),
     shift_hours AS (
       SELECT ds.worker_id,
              u.name AS worker_name,
              ds.contractor,
              GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(ds.time_out, ds.time_in) - ds.time_in)) / 3600) AS hours_logged,
              ((ds.time_in AT TIME ZONE 'Asia/Kolkata')::time > TIME '09:15:00') AS is_late
         FROM daily_shifts ds
         JOIN public.users u ON u.id = ds.worker_id
     )
     SELECT worker_id::text AS worker_id,
            worker_name,
            contractor,
            COALESCE(SUM(hours_logged), 0)::text AS total_hours,
            COALESCE(SUM(CASE WHEN hours_logged > 8 THEN hours_logged - 8 ELSE 0 END), 0)::text AS overtime_hours,
            COALESCE(SUM(CASE WHEN is_late THEN 1 ELSE 0 END), 0)::text AS late_count,
            COUNT(*)::text AS shift_count
       FROM shift_hours
      GROUP BY worker_id, worker_name, contractor
      ORDER BY total_hours DESC`,
    workerParams
  );

  // Contractor/block-level roll-up
  const contrR = await query<{
    contractor: string;
    workers: string;
    total_hours: string;
    late_count: string;
  }>(
    `WITH daily_shifts AS (
       SELECT w.worker_id,
              COALESCE(w.block_id, 'Unassigned') AS contractor,
              (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date AS shift_date,
              MIN(w.logged_at) FILTER (WHERE w.direction = 'IN') AS time_in,
              MAX(w.logged_at) FILTER (WHERE w.direction = 'OUT') AS time_out
         FROM public.worker_attendance_logs w
        WHERE (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
          AND (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date <= $2::date
          ${contractor ? "AND COALESCE(w.block_id, 'Unassigned') = $3" : ""}
        GROUP BY w.worker_id, COALESCE(w.block_id, 'Unassigned'), (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date
     )
     SELECT contractor,
            COUNT(DISTINCT worker_id)::text AS workers,
            COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(time_out, time_in) - time_in)) / 3600)), 0)::text AS total_hours,
            COALESCE(SUM(CASE WHEN (time_in AT TIME ZONE 'Asia/Kolkata')::time > TIME '09:15:00' THEN 1 ELSE 0 END), 0)::text AS late_count
       FROM daily_shifts
      GROUP BY contractor
      ORDER BY total_hours DESC`,
    contractor ? [from, to, contractor] : [from, to]
  );

  // Last-month totals for delta
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  const lmR = await query<{ total_hours: string; late_count: string; shift_count: string }>(
    `WITH daily_shifts AS (
       SELECT w.worker_id,
              (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date AS shift_date,
              MIN(w.logged_at) FILTER (WHERE w.direction = 'IN') AS time_in,
              MAX(w.logged_at) FILTER (WHERE w.direction = 'OUT') AS time_out
         FROM public.worker_attendance_logs w
        WHERE (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
          AND (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date <= $2::date
          ${contractor ? "AND COALESCE(w.block_id, 'Unassigned') = $3" : ""}
        GROUP BY w.worker_id, (w.logged_at AT TIME ZONE 'Asia/Kolkata')::date
     )
     SELECT COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(time_out, time_in) - time_in)) / 3600)), 0)::text AS total_hours,
            COALESCE(SUM(CASE WHEN (time_in AT TIME ZONE 'Asia/Kolkata')::time > TIME '09:15:00' THEN 1 ELSE 0 END), 0)::text AS late_count,
            COUNT(*)::text AS shift_count
       FROM daily_shifts`,
    contractor ? [lmFrom, lmTo, contractor] : [lmFrom, lmTo]
  );

  const curTotalHours = Number(workerR.rows.reduce((s, r) => s + Number(r.total_hours), 0));
  const curLateCount = Number(workerR.rows.reduce((s, r) => s + Number(r.late_count), 0));
  const lmTotalHours = Number(lmR.rows[0]?.total_hours ?? 0);
  const lmLateCount = Number(lmR.rows[0]?.late_count ?? 0);

  return ok({
    period: label,
    range: { from, to },
    summary: {
      totalHours: curTotalHours,
      lateCount: curLateCount,
      workerCount: workerR.rows.length,
      lastMonthHours: lmTotalHours,
      hoursDelta: curTotalHours - lmTotalHours,
      lateDelta: curLateCount - lmLateCount,
    },
    contractors: contrR.rows.map((r) => ({
      contractor: r.contractor,
      workers: Number(r.workers),
      totalHours: Number(r.total_hours),
      lateCount: Number(r.late_count),
    })),
    workers: workerR.rows.map((r) => ({
      id: r.worker_id,
      name: r.worker_name,
      contractor: r.contractor,
      totalHours: Number(r.total_hours),
      overtimeHours: Number(r.overtime_hours),
      lateCount: Number(r.late_count),
      shiftCount: Number(r.shift_count),
    })),
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/admin/worker-shifts/monthly",
  auth: "user",
  requiredRole: ["admin", "sysadmin"],
  rateLimit: { keyPrefix: "admin-worker-monthly", maxRequests: 20, windowMs: 60_000 },
});
