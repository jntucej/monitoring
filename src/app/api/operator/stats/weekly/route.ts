/**
 * GET /api/operator/stats/weekly
 *
 * Operator's weekly shift stats: hours on shift, shift-wise breakdown,
 * last-week compare delta. For the operator's own console.
 *
 * Query params:
 *   week — "this" | "last" (default "this")
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

function weekRange(which: "this" | "last", now = new Date()): { from: string; to: string } {
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  if (which === "last") {
    const ls = new Date(start);
    ls.setDate(start.getDate() - 7);
    const le = new Date(ls);
    le.setDate(ls.getDate() + 6);
    return { from: ls.toISOString().slice(0, 10), to: le.toISOString().slice(0, 10) };
  }
  return { from, to };
}

export const GET = withAuthorization(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    const which = req.nextUrl.searchParams.get("week") === "last" ? "last" : "this";
    const { from, to } = weekRange(which);

    // Hours on shift from gate_logs (operator's own in/out)
    const hoursR = await query<{ hours: string; shifts: string }>(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600), 0)::text AS hours,
              COUNT(DISTINCT entry_date)::text AS shifts
         FROM gate_logs
        WHERE person_id = $1
          AND entry_date >= $2::date AND entry_date <= $3::date`,
      [auth.userId, from, to]
    );

    const hours = Math.round(Number(hoursR.rows[0]?.hours ?? 0) * 10) / 10;
    const shifts = Number(hoursR.rows[0]?.shifts ?? 0);

    // Per-day breakdown
    const dailyR = await query<{ day: string; hours: string }>(
      `SELECT to_char(entry_date, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600), 0)::text AS hours
         FROM gate_logs
        WHERE person_id = $1
          AND entry_date >= $2::date AND entry_date <= $3::date
        GROUP BY entry_date
        ORDER BY entry_date`,
      [auth.userId, from, to]
    );

    // Last week for delta
    const lw = weekRange("last");
    const lwR = await query<{ hours: string; shifts: string }>(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600), 0)::text AS hours,
              COUNT(DISTINCT entry_date)::text AS shifts
         FROM gate_logs
        WHERE person_id = $1
          AND entry_date >= $2::date AND entry_date <= $3::date`,
      [auth.userId, lw.from, lw.to]
    );
    const lastWeekHours = Math.round(Number(lwR.rows[0]?.hours ?? 0) * 10) / 10;
    const lastWeekShifts = Number(lwR.rows[0]?.shifts ?? 0);

    return ok({
      week: which,
      range: { from, to },
      hours,
      shifts,
      lastWeekHours,
      lastWeekShifts,
      hoursDelta: Math.round((hours - lastWeekHours) * 10) / 10,
      daily: dailyR.rows.map((r) => ({
        day: r.day,
        hours: Math.round(Number(r.hours) * 10) / 10,
      })),
    });
  },
  { requiredRole: TIER.OPERATOR }
);
