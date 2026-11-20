/**
 * GET /api/admin/faculty-tracking/monthly
 *
 * Per-faculty monthly/weekly summary: hours on campus, attendance disputes
 * from students, time-in/time-out stats, next classes, last-month compare.
 *
 * Query params:
 *   period     — "this-month" | "last-week" | "this-week" (default "this-month")
 *   department — optional filter
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";

function periodRange(period: string, now = new Date()): { from: string; to: string; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = getIstDateString();

  if (period === "this-week") {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    const from = start.toISOString().slice(0, 10);
    return { from, to: today, label: "This week" };
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
  // default: this-month
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
  return {
    from: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    to: today,
    label: "This month",
  };
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

  // Per-faculty roll-up
  const facR = await query<{
    user_id: string;
    name: string;
    department: string;
    hours_on_campus: string;
    late_count: string;
    days_present: string;
    next_class: string | null;
    next_class_time: string | null;
    disputes_count: string;
  }>(
    `SELECT u.id::text AS user_id,
            u.name,
            COALESCE(d.short_name, u.department_id, 'Unknown') AS department,
            COALESCE(SUM(EXTRACT(EPOCH FROM (g.exit_time - g.entry_time)) / 3600), 0)::text AS hours_on_campus,
            COALESCE(SUM(CASE WHEN g.entry_time > (g.entry_time + INTERVAL '15 minutes') THEN 0 ELSE 1 END), 0)::text AS late_count,
            COUNT(DISTINCT g.entry_date)::text AS days_present,
            (SELECT to_char(ar.date, 'YYYY-MM-DD') FROM attendance_records ar
              JOIN classes c ON c.id = ar.class_id
              JOIN faculty_assignments fa ON fa.class_id = c.id
              WHERE fa.faculty_id = u.id AND ar.date > $1::date
              ORDER BY ar.date ASC LIMIT 1) AS next_class,
            (SELECT to_char(ar.time_in, 'HH24:MI') FROM attendance_records ar
              JOIN classes c ON c.id = ar.class_id
              JOIN faculty_assignments fa ON fa.class_id = c.id
              WHERE fa.faculty_id = u.id AND ar.date > $1::date
              ORDER BY ar.date ASC, ar.time_in LIMIT 1) AS next_class_time,
            COALESCE((SELECT COUNT(*) FROM attendance_disputes ad
              JOIN users su ON su.id = ad.person_id
              WHERE EXISTS (
                SELECT 1 FROM faculty_assignments fa2
                JOIN classes c2 ON c2.id = fa2.class_id
                WHERE fa2.faculty_id = u.id AND su.department_id = c2.department_id
              )
                AND ad.status NOT IN ('RESOLVED','DISMISSED')), 0)::text AS disputes_count
       FROM users u
       LEFT JOIN departments d ON d.code = u.department_id
       LEFT JOIN gate_logs g ON g.person_id = u.id
          AND g.entry_date >= $1::date AND g.entry_date <= $2::date
      WHERE u.role = 'faculty'
      ${deptWhere}
      GROUP BY u.id, u.name, u.department_id, d.short_name
      ORDER BY hours_on_campus DESC`,
    deptParams
  );

  // Last month total hours
  const lmR = await query<{ total_hours: string; days: string }>(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600), 0)::text AS total_hours,
            COUNT(DISTINCT entry_date)::text AS days
       FROM gate_logs
      WHERE person_id IN (SELECT id FROM users WHERE role = 'faculty')
        AND entry_date >= $1::date AND entry_date <= $2::date`,
    [lmFrom, lmTo]
  );

  const lmHours = Number(lmR.rows[0]?.total_hours ?? 0);
  const curHours = facR.rows.reduce((s, r) => s + Number(r.hours_on_campus), 0);

  return ok({
    period: label,
    range: { from, to },
    faculty: facR.rows.map((r) => ({
      id: r.user_id,
      name: r.name,
      department: r.department,
      hoursOnCampus: Math.round(Number(r.hours_on_campus) * 10) / 10,
      lateCount: Number(r.late_count),
      daysPresent: Number(r.days_present),
      nextClass: r.next_class ?? null,
      nextClassTime: r.next_class_time ?? null,
      disputesCount: Number(r.disputes_count),
    })),
    summary: {
      totalHours: Math.round(curHours * 10) / 10,
      lastMonthHours: lmHours,
      hoursDelta: Math.round((curHours - lmHours) * 10) / 10,
      facultyCount: facR.rows.length,
    },
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["admin", "sysadmin", "principal", "hod"] }),
  { keyPrefix: "admin-faculty-monthly", maxRequests: 20, windowMs: 60_000 }
);
