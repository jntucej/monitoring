/**
 * GET /api/operator/stats/exit-reasons
 *
 * Per-reason exit counts for a period + gate breakdown.
 *
 * Query params:
 *   period — "today" | "this-week" | "last-week" | "this-month" | "last-month" | "all"
 *   gateId — optional
 */

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

function periodBounds(period: string, now = new Date()): { from: string; to: string } {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const today = d(now);
  switch (period) {
    case "this-week": {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: d(start), to: today };
    }
    case "last-week": {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: d(start), to: d(end) };
    }
    case "this-month":
      return { from: d(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "last-month":
      return {
        from: d(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: d(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return { from: today, to: today };
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "today";
  const gateId = sp.get("gateId");
  const { from, to } = periodBounds(period);

  const gateWhere = gateId ? "AND m.gate_id = $3::uuid" : "";
  const params: unknown[] = [from, to];
  if (gateId) params.push(gateId);

  const reasonR = await query<{ reason: string; count: string }>(
    `SELECT m.reason AS reason, COUNT(*)::text AS count
       FROM movement_logs m
      WHERE m.direction = 'OUT'
        AND m.timestamp::date >= $1::date AND m.timestamp::date <= $2::date
        ${gateId ? "AND m.gate_id = $3::uuid" : ""}
      GROUP BY m.reason
      ORDER BY COUNT(*) DESC`,
    params
  );

  const perGateR = await query<{ gate_name: string; reason: string; count: string }>(
    `SELECT m.gate_name AS gate_name, m.reason AS reason, COUNT(*)::text AS count
       FROM movement_logs m
      WHERE m.direction = 'OUT'
        AND m.timestamp::date >= $1::date AND m.timestamp::date <= $2::date
        ${gateId ? "AND m.gate_id = $3::uuid" : ""}
      GROUP BY m.gate_name, m.reason
      ORDER BY m.gate_name, COUNT(*) DESC`,
    params
  );

  const total = reasonR.rows.reduce((s, r) => s + Number(r.count), 0);
  const lastWeek = period === "this-week" ? "last-week" : "last-month";
  const { from: pFrom, to: pTo } = periodBounds(lastWeek);
  const prevR = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
       FROM movement_logs
      WHERE direction = 'OUT'
        AND timestamp::date >= $1::date AND timestamp::date <= $2::date`,
    [pFrom, pTo]
  );
  const prevTotal = Number(prevR.rows[0]?.total ?? 0);

  return ok({
    period,
    range: { from, to },
    total,
    prevTotal,
    delta: total - prevTotal,
    byReason: reasonR.rows.map((r) => ({
      reason: r.reason || "UNKNOWN",
      count: Number(r.count),
      pct: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
    })),
    byGate: perGateR.rows.map((r) => ({
      gate: r.gate_name,
      reason: r.reason || "UNKNOWN",
      count: Number(r.count),
    })),
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/operator/stats/exit-reasons",
  auth: "user",
  requiredRole: TIER.OPERATOR,
  rateLimit: { keyPrefix: "operator-exit-reasons", maxRequests: 30, windowMs: 60_000 },
});
