/**
 * GET /api/admin/staff-tracking/monthly
 *
 * Per-staff monthly roll-up: hours on campus, shift adherence, late-arrival
 * reasons, last-month delta. Read-only.
 *
 * Query params:
 *   period     — "this-month" | "last-month" | "this-week" (default "this-month")
 *   department — optional filter
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
  const today = getIstDateString();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === "this-week") {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    return { from: start.toISOString().slice(0, 10), to: today, label: "This week" };
  }
  if (period === "last-week") {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const lwStart = new Date(d);
    lwStart.setDate(d.getDate() + diff - 7);
    const lwEnd = new Date(d);
    lwEnd.setDate(d.getDate() + diff - 1);
    return {
      from: lwStart.toISOString().slice(0, 10),
      to: lwEnd.toISOString().slice(0, 10),
      label: "Last week",
    };
  }
  if (period === "last-month") {
    const lm = new Date(y, m - 1, 1);
    const ly = lm.getFullYear();
    const lmm = lm.getMonth();
    return {
      from: `${ly}-${String(lmm + 1).padStart(2, "0")}-01`,
      to: new Date(ly, lmm + 1, 0).toISOString().slice(0, 10),
      label: "Last month",
    };
  }
  return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: today, label: "This month" };
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const department = sp.get("department");
  const { from, to, label } = periodRange(period);

  // Last-month for delta
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  const deptWhere = department ? "AND u.department_id = $3" : "";
  const deptParams: unknown[] = [from, to];
  if (department) deptParams.push(department);

  const staffR = await query<{
    user_id: string;
    name: string;
    department: string;
    designation: string;
    hours_on_campus: string;
    late_count: string;
    days_present: string;
    on_time_rate: string;
  }>(
    `WITH daily_moves AS (
       SELECT user_id,
              (timestamp AT TIME ZONE 'Asia/Kolkata')::date AS entry_date,
              MIN(timestamp) FILTER (WHERE direction = 'IN') AS entry_time,
              MAX(timestamp) FILTER (WHERE direction = 'OUT') AS exit_time
         FROM public.movement_logs
        WHERE (timestamp AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
          AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date <= $2::date
        GROUP BY user_id, (timestamp AT TIME ZONE 'Asia/Kolkata')::date
     )
     SELECT u.id::text AS user_id,
            u.name,
            COALESCE(d.short_name, u.department_id, 'Unknown') AS department,
            COALESCE(ed.designation, 'Staff') AS designation,
            COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(g.exit_time, g.entry_time) - g.entry_time)) / 3600)), 0)::text AS hours_on_campus,
            COALESCE(SUM(CASE
              WHEN (g.entry_time AT TIME ZONE 'Asia/Kolkata')::time > TIME '09:30:00'
              THEN 1 ELSE 0
            END), 0)::text AS late_count,
            COUNT(DISTINCT g.entry_date)::text AS days_present,
            COALESCE(AVG(CASE WHEN (g.entry_time AT TIME ZONE 'Asia/Kolkata')::time <= TIME '09:30:00' THEN 1.0 ELSE 0.0 END) * 100, 0)::text AS on_time_rate
       FROM users u
       LEFT JOIN departments d ON d.code = u.department_id
       LEFT JOIN employee_details ed ON ed.user_id = u.id
       LEFT JOIN daily_moves g ON g.user_id = u.id
      WHERE u.role IN ('staff', 'worker', 'operator')
      ${deptWhere}
      GROUP BY u.id, u.name, u.department_id, d.short_name, ed.designation
      ORDER BY hours_on_campus DESC`,
    deptParams
  );

  // Last month total
  const lmR = await query<{ total_hours: string; days: string }>(
    `WITH lm_moves AS (
       SELECT user_id,
              (timestamp AT TIME ZONE 'Asia/Kolkata')::date AS entry_date,
              MIN(timestamp) FILTER (WHERE direction = 'IN') AS entry_time,
              MAX(timestamp) FILTER (WHERE direction = 'OUT') AS exit_time
         FROM public.movement_logs
        WHERE user_id IN (SELECT id FROM users WHERE role IN ('staff','worker','operator'))
          AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
          AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date <= $2::date
        GROUP BY user_id, (timestamp AT TIME ZONE 'Asia/Kolkata')::date
     )
     SELECT COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(exit_time, entry_time) - entry_time)) / 3600)), 0)::text AS total_hours,
            COUNT(DISTINCT entry_date)::text AS days
       FROM lm_moves`,
    [lmFrom, lmTo]
  );

  const curHours = staffR.rows.reduce((s, r) => s + Number(r.hours_on_campus), 0);
  const lmHours = Number(lmR.rows[0]?.total_hours ?? 0);

  return ok({
    period: label,
    range: { from, to },
    staff: staffR.rows.map((r) => ({
      id: r.user_id,
      name: r.name,
      department: r.department,
      designation: r.designation,
      hoursOnCampus: Math.round(Number(r.hours_on_campus) * 10) / 10,
      lateCount: Number(r.late_count),
      daysPresent: Number(r.days_present),
      onTimeRate: Math.round(Number(r.on_time_rate)),
    })),
    summary: {
      totalHours: Math.round(curHours * 10) / 10,
      lastMonthHours: lmHours,
      hoursDelta: Math.round((curHours - lmHours) * 10) / 10,
      staffCount: staffR.rows.length,
    },
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/admin/staff-tracking/monthly",
  auth: "user",
  requiredRole: ["admin", "sysadmin"],
  rateLimit: { keyPrefix: "admin-staff-monthly", maxRequests: 20, windowMs: 60_000 },
});
