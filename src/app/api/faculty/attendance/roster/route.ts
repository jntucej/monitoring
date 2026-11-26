/**
 * GET /api/faculty/attendance/roster
 *
 * Per-class roster with per-student attendance, period selector,
 * last-month delta, dispute queue, and upcoming class schedule.
 *
 * Query params:
 *   classId  — required UUID
 *   period   — "this-month" | "last-month" | "all-time" (default "this-month")
 */

import { NextRequest, NextResponse } from "next/server";
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
    case "all-time":
      return { from: "2020-01-01", to: getIstDateString(), label: "All time" };
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
  const classId = sp.get("classId");
  if (!classId) return fail("VALIDATION", "classId required");

  const period = sp.get("period") ?? "this-month";
  const { from, to, label } = periodRange(period);

  // Last month for delta
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  // Class label
  const classR = await query<{ name: string | null; year: number; section: string }>(
    `SELECT name, year, section FROM classes WHERE id = $1::uuid`,
    [classId]
  );
  const cls = classR.rows[0];
  const classLabel = cls ? `${cls.name ?? cls.year} ${cls.year} ${cls.section}` : "Class";

  // Per-student stats
  const stuR = await query<{
    user_id: string;
    name: string;
    unique_id: string;
    present: string;
    absent: string;
    unmarked: string;
  }>(
    `SELECT u.id::text AS user_id,
            u.name,
            u.unique_id,
            COALESCE(SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END), 0)::text AS present,
            COALESCE(SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END), 0)::text AS absent,
            COALESCE(SUM(CASE WHEN ar.status IS NULL OR ar.status = 'UNMARKED' THEN 1 ELSE 0 END), 0)::text AS unmarked
       FROM users u
       LEFT JOIN attendance_records ar
         ON ar.person_id = u.id AND ar.class_id = $1::uuid
            AND ar.date >= $2::date AND ar.date <= $3::date
      WHERE EXISTS (
          SELECT 1 FROM classes c WHERE c.department_id = u.department_id
        )
      GROUP BY u.id, u.name, u.unique_id
      ORDER BY u.name`,
    [classId, from, to]
  );

  const students = stuR.rows.map((r) => {
    const present = Number(r.present);
    const absent = Number(r.absent);
    const unmarked = Number(r.unmarked);
    const total = present + absent;
    return {
      id: r.user_id,
      name: r.name,
      uniqueId: r.unique_id,
      present,
      absent,
      unmarked,
      total,
      pct: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });

  // Summary
  const totalPresent = students.reduce((s, x) => s + x.present, 0);
  const totalAbsent = students.reduce((s, x) => s + x.absent, 0);
  const totalUnmarked = students.reduce((s, x) => s + x.unmarked, 0);
  const totalAll = totalPresent + totalAbsent;
  const pct = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0;

  // Last-month overall pct
  const lmR = await query<{ present: string; total: string }>(
    `SELECT COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END), 0)::text AS present,
            COUNT(*)::text AS total
       FROM attendance_records
      WHERE class_id = $1::uuid AND date >= $2::date AND date <= $3::date`,
    [classId, lmFrom, lmTo]
  );
  const lmPresent = Number(lmR.rows[0]?.present ?? 0);
  const lmTotal = Number(lmR.rows[0]?.total ?? 0);
  const lastMonthPct = lmTotal > 0 ? Math.round((lmPresent / lmTotal) * 100) : null;

  // Disputes for this class (from attendance_disputes if table exists, else empty)
  let disputes: Array<{ id: string; studentName: string; date: string; reason: string; status: string }> = [];
  try {
    const dR = await query<{
      id: string;
      date: string;
      reason: string;
      status: string;
      name: string;
    }>(
      `SELECT d.id::text AS id, to_char(d.date,'YYYY-MM-DD') AS date,
              d.reason, d.status, u.name
         FROM attendance_disputes d
         JOIN users u ON u.id = d.person_id
        WHERE d.status NOT IN ('RESOLVED','DISMISSED')
        ORDER BY d.created_at DESC
        LIMIT 10`
    );
    disputes = dR.rows.map((d) => ({
      id: d.id,
      studentName: d.name,
      date: d.date,
      reason: d.reason,
      status: d.status,
    }));
  } catch {
    // attendance_disputes may not exist yet — degrade gracefully
  }

  // Upcoming sessions for this class
  const upR = await query<{ date: string; time_in: string | null; time_out: string | null }>(
    `SELECT to_char(ar.date, 'YYYY-MM-DD') AS date,
            ar.time_in::text AS time_in,
            ar.time_out::text AS time_out
       FROM attendance_records ar
      WHERE ar.class_id = $1::uuid AND ar.date > $2::date
      GROUP BY ar.date, ar.time_in, ar.time_out
      ORDER BY ar.date ASC
      LIMIT 5`,
    [classId, getIstDateString()]
  );
  const upcoming = upR.rows.map((r) => ({
    date: r.date,
    timeIn: r.time_in,
    timeOut: r.time_out,
  }));

  return ok({
    classId,
    classLabel,
    period: label,
    range: { from, to },
    summary: { total: totalAll, present: totalPresent, absent: totalAbsent, unmarked: totalUnmarked, pct, lastMonthPct },
    students,
    disputes,
    upcoming,
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/faculty/attendance/roster",
  auth: "user",
  requiredRole: ["faculty", "hod", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "faculty-roster", maxRequests: 30, windowMs: 60_000 },
});
