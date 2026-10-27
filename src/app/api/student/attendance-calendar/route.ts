import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/student/attendance-calendar
 *
 * Thin read-only endpoint returning the student's attendance_records rows
 * for the current month (Asia/Kolkata) plus a compact daily calendar payload
 * so the UI can render a month grid without client-side day math.
 *
 * Query params:
 *   month   — "YYYY-MM" (defaults to current month)
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       month: "YYYY-MM",
 *       days: [
 *         { date: "YYYY-MM-DD", status: "PRESENT" | "ABSENT" | null,
 *           time_in: string | null, time_out: string | null }
 *       ],
 *       summary: { present: number, absent: number, unmarked: number, total: number }
 *     }
 *   }
 *
 * Student-tier only; strictly personal-scoped (rows keyed on the caller's
 * user id). Pure read.
 */
interface AttendanceRow {
  date: string; // "YYYY-MM-DD"
  time_in: string | null;
  time_out: string | null;
  status: string | null;
}

function monthRange(month: string): { start: string; end: string; year: number; monthNum: number } {
  const [y, m] = month.split("-").map(Number);
  const year = Number.isNaN(y) ? new Date().getFullYear() : y;
  const monthNum = Number.isNaN(m) ? new Date().getMonth() + 1 : m;
  const start = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  // First day of next month (exclusive end boundary)
  const nextMonth = monthNum === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;
  return { start, end: nextMonth, year, monthNum };
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const monthParam = req.nextUrl.searchParams.get("month") ?? undefined;
    let monthKey: string;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      monthKey = monthParam;
    } else {
      const now = new Date();
      monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const { start, end } = monthRange(monthKey);

    const rows: AttendanceRow[] = (
      await query<AttendanceRow>(
        `SELECT to_char(date, 'YYYY-MM-DD') AS date,
                to_char(time_in,  'YYYY-MM-DD HH24:MI') AS time_in,
                to_char(time_out, 'YYYY-MM-DD HH24:MI') AS time_out,
                status
           FROM attendance_records
          WHERE person_id = $1
            AND date >= $2::date
            AND date <  $3::date
          ORDER BY date ASC`,
        [auth.userId, start, end]
      )
    ).rows;

    // Map to day index (0-30) so the UI can render a grid directly.
    const dayMap = new Map<string, { time_in: string | null; time_out: string | null; status: string | null }>();
    for (const r of rows) {
      dayMap.set(r.date, { time_in: r.time_in, time_out: r.time_out, status: r.status });
    }

    const { year, monthNum } = monthRange(monthKey);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    const days: Array<{ date: string; status: string | null; time_in: string | null; time_out: string | null }> =
      Array.from({ length: daysInMonth }, (_, i) => {
        const dateKey = `${year}-${String(monthNum).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
        const rec = dayMap.get(dateKey);
        return {
          date: dateKey,
          status: rec?.status ?? null,
          time_in: rec?.time_in ?? null,
          time_out: rec?.time_out ?? null,
        };
      });

    const present = days.filter((d) => d.status === "PRESENT" || d.status === "IN" || d.status === "present").length;
    const absent = days.filter((d) => d.status === "ABSENT" || d.status === "OUT" || d.status === "absent").length;

    return NextResponse.json({
      success: true,
      data: {
        month: monthKey,
        days,
        summary: {
          present,
          absent,
          unmarked: days.length - present - absent,
          total: days.length,
        },
      },
    });
  } catch (error) {
    console.error("[student/attendance-calendar] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load attendance calendar." } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["student", "parent", "guardian"] }),
  { keyPrefix: "student_attendance_calendar", maxRequests: 30 }
);

export const dynamic = "force-dynamic";
