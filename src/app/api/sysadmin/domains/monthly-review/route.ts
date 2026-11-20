/**
 * GET /api/sysadmin/domains/monthly-review
 *
 * One aggregate per sysadmin domain: monthly counts, last-month delta,
 * status indicator. Read-only.
 *
 * Query params:
 *   period — "this-month" | "last-month" (default "this-month")
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";

interface DomainSummary {
  domain: string;
  count: number;
  lastMonth: number;
  delta: number;
  status: "ok" | "warn" | "fail";
}

function periodBounds(period: string, now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "last-month") {
    const lm = new Date(y, m - 1, 1);
    const ly = lm.getFullYear();
    const lmm = lm.getMonth();
    return {
      from: `${ly}-${String(lmm + 1).padStart(2, "0")}-01`,
      to: new Date(ly, lmm + 1, 0).toISOString().slice(0, 10),
    };
  }
  return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: getIstDateString() };
}

async function countRows(table: string, where: string, params: unknown[]): Promise<number> {
  try {
    const r = await query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM ${table} WHERE ${where}`, params);
    return Number(r.rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const { from, to } = periodBounds(period);

  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  const domains: DomainSummary[] = [];

  // alerts
  const alertsCur = await countRows("audit_logs", `action LIKE '%ALERT%' AND created_at::date >= $1::date AND created_at::date <= $2::date`, [from, to]);
  const alertsLm = await countRows("audit_logs", `action LIKE '%ALERT%' AND created_at::date >= $1::date AND created_at::date <= $2::date`, [lmFrom, lmTo]);
  domains.push({ domain: "alerts", count: alertsCur, lastMonth: alertsLm, delta: alertsCur - alertsLm, status: alertsCur - alertsLm > 10 ? "warn" : "ok" });

  // incidents
  const incCur = await countRows("audit_logs", `action IN ('GATE_OFFLINE','EMERGENCY_BROADCAST','BACK_GATE_GEO_MISMATCH') AND created_at::date >= $1::date AND created_at::date <= $2::date`, [from, to]);
  const incLm = await countRows("audit_logs", `action IN ('GATE_OFFLINE','EMERGENCY_BROADCAST','BACK_GATE_GEO_MISMATCH') AND created_at::date >= $1::date AND created_at::date <= $2::date`, [lmFrom, lmTo]);
  domains.push({ domain: "incidents", count: incCur, lastMonth: incLm, delta: incCur - incLm, status: incCur > 0 ? "warn" : "ok" });

  // user provisioning
  const userCur = await countRows("users", `created_at::date >= $1::date AND created_at::date <= $2::date`, [from, to]);
  const userLm = await countRows("users", `created_at::date >= $1::date AND created_at::date <= $2::date`, [lmFrom, lmTo]);
  domains.push({ domain: "identity", count: userCur, lastMonth: userLm, delta: userCur - userLm, status: "ok" });

  // complaints
  const compCur = await countRows("complaints", `created_at::date >= $1::date AND created_at::date <= $2::date`, [from, to]);
  const compLm = await countRows("complaints", `created_at::date >= $1::date AND created_at::date <= $2::date`, [lmFrom, lmTo]);
  domains.push({ domain: "complaints", count: compCur, lastMonth: compLm, delta: compCur - compLm, status: compCur - compLm > 5 ? "warn" : "ok" });

  // gates offline
  const gateCur = await countRows("audit_logs", `action = 'GATE_OFFLINE' AND created_at::date >= $1::date AND created_at::date <= $2::date`, [from, to]);
  const gateLm = await countRows("audit_logs", `action = 'GATE_OFFLINE' AND created_at::date >= $1::date AND created_at::date <= $2::date`, [lmFrom, lmTo]);
  domains.push({ domain: "gates", count: gateCur, lastMonth: gateLm, delta: gateCur - gateLm, status: gateCur > 0 ? "warn" : "ok" });

  return ok({
    period,
    range: { from, to },
    domains,
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin-monthly-review", maxRequests: 20, windowMs: 60_000 }
);
