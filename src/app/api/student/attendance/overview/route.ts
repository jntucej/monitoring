/**
 * GET /api/student/attendance/overview
 *
 * Rich attendance overview: current period + previous period + 30-day daily
 * series + next classes (from class_periods / class_flexible).
 *
 * Query params:
 *   period   — "today" | "this-week" | "last-week" | "this-month" | "last-month" | "all"
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

type PeriodKey = "today" | "this-week" | "last-week" | "this-month" | "last-month" | "all";

function periodRange(key: PeriodKey, now = new Date()): { from: string; to: string; label: string } {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const today = d(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const dd = now.getDate();
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();

  switch (key) {
    case "this-week": {
      const start = new Date(now);
      start.setDate(dd + diff);
      return { from: d(start), to: today, label: "This week" };
    }
    case "last-week": {
      const start = new Date(now);
      start.setDate(dd + diff - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: d(start), to: d(end), label: "Last week" };
    }
    case "this-month":
      return { from: d(new Date(y, m, 1)), to: today, label: "This month" };
    case "last-month":
      return {
        from: d(new Date(y, m - 1, 1)),
        to: d(new Date(y, m, 0)),
        label: "Last month",
      };
    default:
      return { from: today, to: today, label: "Today" };
  }
}

function prevPeriodOf(key: PeriodKey, now = new Date()): { from: string; to: string } {
  switch (key) {
    case "this-week": {
      const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() + diff - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: end.toISOString().slice(0, 10), to: start.toISOString().slice(0, 10) };
    }
    case "this-month": {
      const y = now.getFullYear();
      const m = now.getMonth();
      return {
        from: new Date(y, m - 1, 1).toISOString().slice(0, 10),
        to: new Date(y, m, 0).toISOString().slice(0, 10),
      };
    }
    case "last-week": {
      const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() + diff - 14);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case "last-month": {
      const y = now.getFullYear();
      const m = now.getMonth();
      return {
        from: new Date(y, m - 2, 1).toISOString().slice(0, 10),
        to: new Date(y, m - 1, 0).toISOString().slice(0, 10),
      };
    }
    default:
      return { from: now.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = (sp.get("period") ?? "this-month") as PeriodKey;
  const { from, to, label } = periodRange(period);
  const prev = prevPeriodOf(period);

  // Resolve the student's class(es) — class_id may not exist on attendance_records
  const classR = await query<{ class_id: string }>(
    `SELECT DISTINCT c.id::text AS class_id
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
       LEFT JOIN public.classes c ON c.department_id = sd.department
         AND c.year = sd.year::int
         AND c.section = sd.section
      WHERE u.id = $1::uuid`,
    [auth.userId]
  );
  const classIds = classR.rows.map((r) => r.class_id).filter(Boolean);

  if (classIds.length === 0) {
    return ok({
      period: label,
      range: { from, to },
      summary: { present: 0, absent: 0, unmarked: 0, total: 0, pct: 0 },
      prev: { present: 0, absent: 0, unmarked: 0, total: 0, pct: 0 },
      delta: 0,
      daily: [],
      nextClasses: [],
    });
  }

  // Current period attendance
  const curR = await query<{ status: string; total: string }>(
    `SELECT status, COUNT(*)::text AS total
       FROM public.attendance_records
      WHERE person_id = $1::uuid
        AND date >= $2::date AND date <= $3::date
      GROUP BY status`,
    [auth.userId, from, to]
  );
  let curPresent = 0, curAbsent = 0, curUnmarked = 0;
  for (const r of curR.rows) {
    const up = (r.status ?? "").toUpperCase();
    if (up === "PRESENT" || up === "IN") curPresent += Number(r.total);
    else if (up === "ABSENT" || up === "OUT") curAbsent += Number(r.total);
    else curUnmarked += Number(r.total);
  }
  const curTotal = curPresent + curAbsent + curUnmarked;
  const curPct = curTotal > 0 ? Math.round((curPresent / curTotal) * 100) : 0;

  // Previous period
  const prevR = await query<{ status: string; total: string }>(
    `SELECT status, COUNT(*)::text AS total
       FROM public.attendance_records
      WHERE person_id = $1::uuid
        AND date >= $2::date AND date <= $3::date
      GROUP BY status`,
    [auth.userId, prev.from, prev.to]
  );
  let prevPresent = 0, prevAbsent = 0;
  for (const r of prevR.rows) {
    const up = (r.status ?? "").toUpperCase();
    if (up === "PRESENT" || up === "IN") prevPresent += Number(r.total);
    else if (up === "ABSENT" || up === "OUT") prevAbsent += Number(r.total);
  }
  const prevTotal = prevPresent + prevAbsent;
  const prevPct = prevTotal > 0 ? Math.round((prevPresent / prevTotal) * 100) : 0;

  // 30-day daily series (for sparkline / heatmap)
  const dailyR = await query<{ date: string; status: string | null }>(
    `SELECT to_char(g.d::date, 'YYYY-MM-DD') AS date,
            ar.status
       FROM generate_series(
         (CURRENT_DATE - 29) :: date, CURRENT_DATE, '1 day'::interval
       ) g(d)
       LEFT JOIN public.attendance_records ar
         ON ar.person_id = $1::uuid AND ar.date = g.d::date
      ORDER BY g.d`,
    [auth.userId]
  );
  const daily = dailyR.rows.map((r) => ({ date: r.date, status: r.status }));

  // Next 5 classes today (class_periods for today's day-of-week, joined with faculty)
  const dow = (new Date().getDay() + 1) % 7; // Postgres: 1=Mon..7=Sun
  const todayDow = new Date().getDay() || 7;
  const nextR = await query<{
    period_no: string;
    start_time: string;
    end_time: string;
    hall: string;
    faculty_name: string;
    subject_code: string;
  }>(
    `SELECT cp.period_no::text,
          to_char(cp.start_time, 'HH24:MI') AS start_time,
          to_char(cp.end_time, 'HH24:MI') AS end_time,
          cp.hall,
          COALESCE(u.name, 'TBA') AS faculty_name,
          ''::text AS subject_code
     FROM public.class_periods cp
     LEFT JOIN public.users u ON u.id = cp.faculty_id
      WHERE cp.class_id = ANY($1::uuid[])
        AND cp.day_of_week = $2
      ORDER BY cp.start_time
      LIMIT 5`,
    [classIds, todayDow]
  );

  // Flexible overrides for today
  const flexR = await query<{
    session_date: string;
    start_time: string;
    end_time: string;
    hall: string;
    type: string;
  }>(
    `SELECT to_char(cf.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cf.start_time, 'HH24:MI') AS start_time,
            to_char(cf.end_time, 'HH24:MI') AS end_time,
            cf.hall,
            cf.type
       FROM public.class_flexible cf
      WHERE cf.class_id = ANY($1::uuid[])
        AND cf.session_date = CURRENT_DATE
      ORDER BY cf.start_time`,
    [classIds]
  );

  return ok({
    period: label,
    range: { from, to },
    summary: { present: curPresent, absent: curAbsent, unmarked: curUnmarked, total: curTotal, pct: curPct },
    prev: { present: prevPresent, absent: prevAbsent, total: prevTotal, pct: prevPct },
    delta: curPct - prevPct,
    daily,
    nextClasses: nextR.rows.map((r) => ({
      periodNo: Number(r.period_no),
      start: r.start_time,
      end: r.end_time,
      hall: r.hall,
      faculty: r.faculty_name,
      subject: r.subject_code,
    })),
    flexibleToday: flexR.rows.map((r) => ({
      date: r.session_date,
      start: r.start_time,
      end: r.end_time,
      hall: r.hall,
      type: r.type,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student"] }),
  { keyPrefix: "student-attendance-overview", maxRequests: 30, windowMs: 60_000 }
);
