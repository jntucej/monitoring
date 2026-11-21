/**
 * GET /api/student/attendance
 *
 * Student's attendance with period selector, per-subject breakdown,
 * disputes, next schedule, and last-month comparison.
 *
 * Query params:
 *   period  — "this-month" | "last-month" | "all-time" (default "this-month")
 *   month   — "YYYY-MM" override (ignored if period is set)
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { getIstDateString } from "@/server/policy/dates";

interface AttendanceSummaryRow {
  total: string;
  present: string;
  absent: string;
  unmarked: string;
}

interface SubjectBreakdownRow {
  subject_code: string | null;
  present: string;
  absent: string;
  total: string;
  avg_time_minutes: string;
}

interface DisputeRow {
  id: string;
  date: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface ScheduleRow {
  date: string;
  subject_code: string;
  faculty_name: string;
  time_in: string | null;
  time_out: string | null;
}

function periodRange(period: string, now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  switch (period) {
    case "last-month": {
      const lm = new Date(y, m - 1, 1);
      const ly = lm.getFullYear();
      const lmm = lm.getMonth();
      return {
        from: `${ly}-${String(lmm + 1).padStart(2, "0")}-01`,
        to: new Date(ly, lmm + 1, 0).toISOString().slice(0, 10),
      };
    }
    case "all-time":
      return { from: "2000-01-01", to: now.toISOString().slice(0, 10) };
    default: // this-month
      return {
        from: `${y}-${String(m + 1).padStart(2, "0")}-01`,
        to: now.toISOString().slice(0, 10),
      };
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const { from, to } = periodRange(period);

  // Last month for delta comparison
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  const [summary, subjects, disputes, schedule, lastMonth] = await Promise.all([
    // Current period summary
    query<AttendanceSummaryRow>(
      `SELECT COUNT(*)::text AS total,
              COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END), 0)::text AS present,
              COALESCE(SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END), 0)::text AS absent,
              COALESCE(SUM(CASE WHEN status IS NULL OR status = 'UNMARKED' THEN 1 ELSE 0 END), 0)::text AS unmarked
         FROM attendance_records
        WHERE person_id = $1 AND date >= $2 AND date <= $3`,
      [auth.userId, from, to]
    ),
    // Per-subject breakdown (class_id not available on attendance_records — return empty)
    query<SubjectBreakdownRow>(
      `SELECT NULL::text AS subject_code, '0' AS present, '0' AS absent, '0' AS total, '0' AS avg_time_minutes
         WHERE FALSE
        LIMIT 0`,
      []
    ),
    // Open disputes
    query<DisputeRow>(
      `SELECT id::text, to_char(date, 'YYYY-MM-DD') AS date, reason, status,
              to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
              CASE WHEN resolved_at IS NULL THEN NULL ELSE to_char(resolved_at, 'YYYY-MM-DD HH24:MI') END AS resolved_at
         FROM attendance_disputes
        WHERE person_id = $1 AND status NOT IN ('RESOLVED', 'DISMISSED')
        ORDER BY created_at DESC
        LIMIT 20`,
      [auth.userId]
    ),
    // Next 5 upcoming records (no class_id on attendance_records)
    query<ScheduleRow>(
      `SELECT to_char(ar.date, 'YYYY-MM-DD') AS date,
              NULL::text AS subject_code,
              NULL::text AS faculty_name,
              ar.time_in::text AS time_in,
              ar.time_out::text AS time_out
         FROM attendance_records ar
        WHERE ar.person_id = $1 AND ar.date > $2
        ORDER BY ar.date ASC, ar.time_in
        LIMIT 5`,
      [auth.userId, getIstDateString()]
    ),
    // Last month summary for delta
    query<AttendanceSummaryRow>(
      `SELECT COUNT(*)::text AS total,
              COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END), 0)::text AS present
         FROM attendance_records
        WHERE person_id = $1 AND date >= $2 AND date <= $3`,
      [auth.userId, lmFrom, lmTo]
    ),
  ]);

  const s = summary.rows[0];
  const total = Number(s?.total ?? 0);
  const present = Number(s?.present ?? 0);
  const absent = Number(s?.absent ?? 0);
  const unmarked = Number(s?.unmarked ?? 0);
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const lmTotal = Number(lastMonth.rows[0]?.total ?? 0);
  const lmPresent = Number(lastMonth.rows[0]?.present ?? 0);
  const lmPct = lmTotal > 0 ? Math.round((lmPresent / lmTotal) * 100) : null;

  return ok({
    period,
    range: { from, to },
    summary: {
      total, present, absent, unmarked,
      pct,
      lastMonthPct: lmPct,
      delta: lmPct !== null ? pct - lmPct : null,
    },
    subjects: subjects.rows.map((r) => ({
      classId: r.subject_code,
      present: Number(r.present),
      absent: Number(r.absent),
      total: Number(r.total),
      pct: Number(r.total) > 0 ? Math.round((Number(r.present) / Number(r.total)) * 100) : 0,
      avgTimeMinutes: Math.round(Number(r.avg_time_minutes)),
    })),
    disputes: disputes.rows.map((d) => ({
      id: d.id,
      date: d.date,
      reason: d.reason,
      status: d.status,
      createdAt: d.created_at,
      resolvedAt: d.resolved_at,
    })),
    upcoming: schedule.rows.map((r) => ({
      date: r.date,
      subject: r.subject_code,
      faculty: r.faculty_name,
      timeIn: r.time_in,
      timeOut: r.time_out,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student"] }),
  { keyPrefix: "student-attendance", maxRequests: 30, windowMs: 60_000 }
);
