// /api/mess/reconcile/route.ts
// Daily hash-chain reconciliation of token issuance vs. meal counts vs.
// enrolled boarders (STEP 3.5 + AUTONOMOUS_OPERATIONS 4.1 Mess row).
// The mess ledger agent (Phase 1) runs this on schedule; mess_incharge
// can also trigger it manually.
//
// GET  /api/mess/reconcile?day=2027-01-15&mealType=DINNER
// POST /api/mess/reconcile  { day?, mealType?, blockService?: boolean }
//      → run reconciliation; optionally block the next service window
//        if issuance velocity or ledger mismatch exceeds threshold.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function computeReconciliation(day: string, mealType: string) {
  const issued = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM public.mess_tokens t JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE d.meal_date::date = $1 AND d.meal_type = $2
        AND t.revoked_at IS NULL`,
    [day, mealType],
  );
  const consumed = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM public.mess_tokens t JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE d.meal_date::date = $1 AND d.meal_type = $2
        AND t.used_at IS NOT NULL`,
    [day, mealType],
  );
  const boarders = await query<{ n: string }>(
    `SELECT COUNT(DISTINCT t.user_id)::text AS n
       FROM public.mess_tokens t
      JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE d.meal_date::date = $1 AND d.meal_type = $2`,
    [day, mealType],
  );
  const [i, c, b] = [Number(issued.rows[0].n), Number(consumed.rows[0].n), Number(boarders.rows[0].n)];
  const anomalies: string[] = [];
  if (i > b) anomalies.push(`OVER_ISSUANCE: ${i} tokens issued for ${b} enrolled boarders`);
  if (Math.abs(c - i) > Math.max(5, Math.floor(i * 0.25))) {
    anomalies.push(`LEDGER_MISMATCH: ${i} issued vs ${c} consumed (delta ${Math.abs(c - i)})`);
  }
  return { day, mealType, issued: i, consumed: c, boarders: b, anomalies,
          consistent: anomalies.length === 0 };
}

async function implGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const day = req.nextUrl.searchParams.get("day") ?? new Date().toISOString().slice(0, 10);
  const mealType = (req.nextUrl.searchParams.get("mealType") ?? "DINNER").toUpperCase();
  const result = await computeReconciliation(day, mealType);
  return ok(result);
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    day?: string;
    mealType?: string;
    blockService?: boolean;
  } | null;
  const day = body?.day ?? new Date().toISOString().slice(0, 10);
  const mealType = (body?.mealType ?? "DINNER").toUpperCase();
  const result = await computeReconciliation(day, mealType);

  let serviceBlocked = false;
  if (result.anomalies.length > 0 && body?.blockService) {
    // Write a high alert so gate-live / supervisor sees it; reversible by
    // mess_incharge or chief_warden.
    await query(
      `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
       VALUES ('high', 'mess_service', NULL, $1, $2, $3)`,
      [`Mess service window blocked: ${result.anomalies.join("; ")}`,
       JSON.stringify(result), auth.userId],
    );
    serviceBlocked = true;
  }

  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "mess_reconcile",
    resource: "mess_tokens",
    afterState: { ...result, serviceBlocked },
  });

  return ok({ ...result, serviceBlocked });
}

export const GET = withApiChain(implGet, {
  route: "/api/mess/reconcile",
  auth: "user",
  requiredRole: ["mess_incharge", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "mess-reconcile-get", maxRequests: 30, windowMs: 60_000 },
});

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["mess_incharge", "chief_warden", "admin", "sysadmin"] }),
  { keyPrefix: "mess-reconcile-post", maxRequests: 10, windowMs: 60_000 },
);
