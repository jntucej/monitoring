// /api/sysadmin/approvals/two-person/route.ts
// Maker-checker queue for high-risk grants (IMPLEMENTATION_BLUEPRINT
// STEP 6.4): SYSADMIN_GRANT, MESS_CONTRACTOR_ESCALATION,
// MENU_COST_CHANGE_ABOVE_THRESHOLD, and any action the API layer
// parked here. The DB constraint (maker_ne_checker) is the floor;
// this queue is where the human second pair of eyes lands.
//
// GET  — list PENDING approvals (sysadmin/admin; maker can see their own)
// POST — { approvalId, decision: "approve"|"reject", reason } ; the
//        checker must NOT be the maker (DB re-checks on write).

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const mine = req.nextUrl.searchParams.get("mine") === "true";
  let sql = `
    SELECT pa.id, pa.action, pa.resource, pa.resource_id, pa.payload,
           pa.status, pa.reason, pa.expires_at, pa.created_at,
           u1.name AS maker_name, u1.role AS maker_role,
           CASE WHEN u2.id IS NOT NULL THEN u2.name END AS assigned_checker
       FROM public.pending_approvals pa
       JOIN public.users u1 ON u1.id = pa.maker_id
       LEFT JOIN public.users u2 ON u2.id = pa.checker_id
      WHERE pa.status = 'PENDING'
        AND pa.expires_at > now()`;
  const params: unknown[] = [];
  if (mine) { sql += ` AND pa.maker_id = $${params.push(auth.userId)}`; }
  sql += " ORDER BY pa.created_at ASC LIMIT 100";
  const { rows } = await query(sql, params);
  return ok({ pending: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    approvalId?: string;
    decision?: string;
    reason?: string;
  } | null;
  if (!body?.approvalId || (body.decision !== "approve" && body.decision !== "reject")) {
    return fail("VALIDATION_ERROR", "approvalId and decision (approve|reject) required", 400);
  }

  const { rows } = await query<{ maker_id: string; action: string; resource: string; resource_id: string | null; payload: unknown }>(
    `SELECT maker_id, action, resource, resource_id, payload
       FROM public.pending_approvals WHERE id = $1 AND status = 'PENDING'`,
    [body.approvalId],
  );
  if (rows.length === 0) return fail("NOT_FOUND", "Pending approval not found or already decided", 404);
  const pa = rows[0];

  // Maker cannot be checker — re-check here (the DB constraint is the
  // final backstop; this gives a clean 403 with a reason).
  if (pa.maker_id === auth.userId) {
    return fail("FORBIDDEN", "Maker cannot be the checker for their own approval", 403);
  }

  const newStatus = body.decision === "approve" ? "APPROVED" : "REJECTED";
  await query(
    `UPDATE public.pending_approvals
        SET status = $1, checker_id = $2, decided_at = now(),
            reason = COALESCE($3, reason)
      WHERE id = $4`,
    [newStatus, auth.userId, body.reason?.trim() || null, body.approvalId],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role,
    action: `two_person_${body.decision}:${pa.action}`,
    resource: pa.resource, resourceId: pa.resource_id ?? body.approvalId,
    afterState: { checkerRole: auth.role, reason: body.reason ?? null },
  });
  return ok({ approvalId: body.approvalId, status: newStatus });
}

export const GET = withApiChain(implGet, {
  route: "/api/sysadmin/approvals/two-person",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "two-person-get", maxRequests: 30, windowMs: 60_000 },
});

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "two-person-post", maxRequests: 10, windowMs: 60_000 },
);
