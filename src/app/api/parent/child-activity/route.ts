/**
 * GET /api/parent/child-activity
 *
 * Guardian's child activity review: period-scoped gate log, time-spent total,
 * heatmap (day-of-week x hour), last-month delta, upcoming schedule.
 *
 * Query params:
 *   childId — required (user id of the child)
 *   period  — "this-week" | "last-week" | "this-month" | "last-month" (default "this-week")
 */

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

function periodRange(period: string, now = new Date()): { from: string; to: string; label: string } {
  const today = now.toISOString().slice(0, 10);
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (period) {
    case "last-week": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(d);
      start.setDate(d.getDate() + diff - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), label: "Last week" };
    }
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
    case "this-month":
      return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: today, label: "This month" };
    default: // this-week
      {
        const d = new Date(now);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const start = new Date(d);
        start.setDate(d.getDate() + diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), label: "This week" };
      }
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const childId = sp.get("childId");
  if (!childId) return fail("VALIDATION", "childId required");

  // Verify this child is linked to the guardian
  const linkR = await query<{ child_id: string }>(
    `SELECT child_id::text FROM guardian_links WHERE parent_id = $1 AND child_id = $2`,
    [auth.userId, childId]
  );
  if (linkR.rows.length === 0) {
    // Allow if the caller is admin/sysadmin
    if (!["admin", "sysadmin"].includes(auth.role)) {
      return fail("FORBIDDEN", "Not your child", 403);
    }
  }

  const period = sp.get("period") ?? "this-week";
  const { from, to, label } = periodRange(period);

  // Activity log
  const actR = await query<{
    date: string;
    direction: string;
    gate_name: string;
    time_in: string | null;
    time_out: string | null;
  }>(
    `SELECT to_char((m.timestamp AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS date,
            m.direction,
            m.gate_name,
            CASE WHEN m.direction = 'IN' THEN m.timestamp::text ELSE NULL END AS time_in,
            CASE WHEN m.direction = 'OUT' THEN m.timestamp::text ELSE NULL END AS time_out
       FROM public.movement_logs m
      WHERE m.user_id = $1::uuid
        AND (m.timestamp AT TIME ZONE 'Asia/Kolkata')::date >= $2::date
        AND (m.timestamp AT TIME ZONE 'Asia/Kolkata')::date <= $3::date
      ORDER BY m.timestamp DESC
      LIMIT 50`,
    [childId, from, to]
  );

  // Time spent on campus
  const timeR = await query<{ hours: string }>(
    `WITH daily_moves AS (
       SELECT (timestamp AT TIME ZONE 'Asia/Kolkata')::date AS entry_date,
              MIN(timestamp) FILTER (WHERE direction = 'IN') AS entry_time,
              MAX(timestamp) FILTER (WHERE direction = 'OUT') AS exit_time
         FROM public.movement_logs
        WHERE user_id = $1::uuid
          AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date >= $2::date
          AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date <= $3::date
        GROUP BY (timestamp AT TIME ZONE 'Asia/Kolkata')::date
     )
     SELECT COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600)), 0)::text AS hours
       FROM daily_moves
      WHERE exit_time IS NOT NULL AND entry_time IS NOT NULL`,
    [childId, from, to]
  );
  const hoursOnCampus = Math.round(Number(timeR.rows[0]?.hours ?? 0) * 10) / 10;

  // Last-month for delta
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);
  const lmR = await query<{ hours: string }>(
    `WITH daily_moves AS (
       SELECT (timestamp AT TIME ZONE 'Asia/Kolkata')::date AS entry_date,
              MIN(timestamp) FILTER (WHERE direction = 'IN') AS entry_time,
              MAX(timestamp) FILTER (WHERE direction = 'OUT') AS exit_time
         FROM public.movement_logs
        WHERE user_id = $1::uuid
          AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date >= $2::date
          AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date <= $3::date
        GROUP BY (timestamp AT TIME ZONE 'Asia/Kolkata')::date
     )
     SELECT COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600)), 0)::text AS hours
       FROM daily_moves
      WHERE exit_time IS NOT NULL AND entry_time IS NOT NULL`,
    [childId, lmFrom, lmTo]
  );
  const lastMonthHours = Math.round(Number(lmR.rows[0]?.hours ?? 0) * 10) / 10;

  // Heatmap: day-of-week x hour (0-23) counts
  const heatR = await query<{ dow: string; hr: string; n: string }>(
    `SELECT EXTRACT(ISODOW FROM (timestamp AT TIME ZONE 'Asia/Kolkata'))::text AS dow,
            EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'Asia/Kolkata'))::text AS hr,
            COUNT(*)::text AS n
       FROM public.movement_logs
      WHERE user_id = $1::uuid
        AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date >= $2::date
        AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date <= $3::date
      GROUP BY 1, 2`,
    [childId, from, to]
  );
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxCount = 0;
  for (const r of heatR.rows) {
    const dow = Number(r.dow) - 1; // ISODOW: Mon=1..Sun=7
    const hr = Number(r.hr);
    const n = Number(r.n);
    if (dow >= 0 && dow < 7 && hr >= 0 && hr < 24) {
      heatmap[dow][hr] = n;
      if (n > maxCount) maxCount = n;
    }
  }

  // Upcoming (next 5)
  const upR = await query<{ date: string; gate_name: string; time_in: string | null }>(
    `SELECT to_char((m.timestamp AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS date,
            m.gate_name,
            m.timestamp::text AS time_in
       FROM public.movement_logs m
      WHERE m.user_id = $1::uuid
        AND (m.timestamp AT TIME ZONE 'Asia/Kolkata')::date > $2::date
      ORDER BY m.timestamp ASC
      LIMIT 5`,
    [childId, to]
  );

  const childNameR = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1::uuid`,
    [childId]
  );

  return ok({
    child: {
      id: childId,
      name: childNameR.rows[0]?.name ?? "Child",
    },
    period: label,
    range: { from, to },
    activity: actR.rows.map((r) => ({
      date: r.date,
      direction: r.direction,
      gate: r.gate_name,
      timeIn: r.time_in,
      timeOut: r.time_out,
    })),
    timeSpent: {
      hours: hoursOnCampus,
      lastMonthHours,
      delta: Math.round((hoursOnCampus - lastMonthHours) * 10) / 10,
    },
    heatmap: { grid: heatmap, max: maxCount },
    upcoming: upR.rows.map((r) => ({
      date: r.date,
      gate: r.gate_name,
      timeIn: r.time_in,
    })),
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/parent/child-activity",
  auth: "user",
  requiredRole: ["parent", "guardian", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "parent-child-activity", maxRequests: 30, windowMs: 60_000 },
});
