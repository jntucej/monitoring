/**
 * GET /api/operator/recent-scans/summary
 *
 * Shift summary for the operator: entries/exits per hour and per gate
 * for a period, with last-period delta.
 *
 * Query params:
 *   period   — "today" | "this-week" | "last-week" (default "today")
 *   gateId   — optional gate filter
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

function periodBounds(period: string, now = new Date()): { from: string; to: string; label: string } {
  const today = new Date(now).toISOString().slice(0, 10);
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // Monday

  switch (period) {
    case "this-week": {
      const start = new Date(now);
      start.setDate(d + diff);
      return { from: start.toISOString().slice(0, 10), to: today, label: "This week" };
    }
    case "last-week": {
      const start = new Date(now);
      start.setDate(d + diff - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), label: "Last week" };
    }
    default:
      return { from: today, to: today, label: "Today" };
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "today";
  const gateId = sp.get("gateId");
  const { from, to, label } = periodBounds(period);

  const gateWhere = gateId ? "AND m.gate_id = $4::uuid" : "";
  const params: unknown[] = [auth.userId, from, to];
  if (gateId) params.push(gateId);

  // Totals
  const totR = await query<{ entries: string; exits: string; total: string }>(
    `SELECT COALESCE(SUM(CASE WHEN direction = 'IN' THEN 1 ELSE 0 END), 0)::text AS entries,
            COALESCE(SUM(CASE WHEN direction = 'OUT' THEN 1 ELSE 0 END), 0)::text AS exits,
            COUNT(*)::text AS total
       FROM movement_logs m
      WHERE m.operator_id = $1::uuid
        AND m.timestamp::date >= $2::date AND m.timestamp::date <= $3::date
        ${gateId ? "AND m.gate_id = $4::uuid" : ""}`,
    params
  );
  const entries = Number(totR.rows[0]?.entries ?? 0);
  const exits = Number(totR.rows[0]?.exits ?? 0);
  const total = Number(totR.rows[0]?.total ?? 0);

  // Per-hour breakdown
  const hourlyR = await query<{ hr: string; entries: string; exits: string }>(
    `SELECT EXTRACT(HOUR FROM m.timestamp)::text AS hr,
            COALESCE(SUM(CASE WHEN m.direction = 'IN' THEN 1 ELSE 0 END), 0)::text AS entries,
            COALESCE(SUM(CASE WHEN m.direction = 'OUT' THEN 1 ELSE 0 END), 0)::text AS exits
       FROM movement_logs m
      WHERE m.operator_id = $1::uuid
        AND m.timestamp::date >= $2::date AND m.timestamp::date <= $3::date
        ${gateId ? "AND m.gate_id = $4::uuid" : ""}
      GROUP BY EXTRACT(HOUR FROM m.timestamp)
      ORDER BY 1`,
    params
  );

  // Per-gate breakdown
  const perGateR = await query<{ gate_name: string; entries: string; exits: string; total: string }>(
    `SELECT m.gate_name,
            COALESCE(SUM(CASE WHEN m.direction = 'IN' THEN 1 ELSE 0 END), 0)::text AS entries,
            COALESCE(SUM(CASE WHEN m.direction = 'OUT' THEN 1 ELSE 0 END), 0)::text AS exits,
            COUNT(*)::text AS total
       FROM movement_logs m
      WHERE m.operator_id = $1::uuid
        AND m.timestamp::date >= $2::date AND m.timestamp::date <= $3::date
        ${gateId ? "AND m.gate_id = $4::uuid" : ""}
      GROUP BY m.gate_name
      ORDER BY total DESC`,
    params
  );

  // Last-period delta
  const prevLabel = period === "today" ? "This week" : "Last week";
  const { from: pFrom, to: pTo } = periodBounds("last-week");
  const prevR = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
       FROM movement_logs
      WHERE operator_id = $1::uuid
        AND timestamp::date >= $2::date AND timestamp::date <= $3::date`,
    [auth.userId, pFrom, pTo]
  );
  const prevTotal = Number(prevR.rows[0]?.total ?? 0);
  void prevLabel;

  return ok({
    period: label,
    range: { from, to },
    summary: {
      entries,
      exits,
      total,
      prevTotal,
      delta: total - prevTotal,
    },
    hourly: hourlyR.rows.map((r) => ({
      hour: Number(r.hr),
      entries: Number(r.entries),
      exits: Number(r.exits),
    })),
    perGate: perGateR.rows.map((r) => ({
      gate: r.gate_name,
      entries: Number(r.entries),
      exits: Number(r.exits),
      total: Number(r.total),
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: TIER.OPERATOR }),
  { keyPrefix: "operator-recent-scans-summary", maxRequests: 30, windowMs: 60_000 }
);
