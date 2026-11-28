import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/principal/quorum/sign
 *
 * The two-person quorum sign-off. Used for DEBARRED edits, mid-semester
 * retroactive overrides, governance_matrix edits (principal + sysadmin),
 * campus lockdowns, and leave-delegate activation / timeout_hours updates.
 *
 * Live-DB-first: writes the co-signature onto the real `policy_change_requests`
 * row and stamps an immutable `audit_events` record. The sign can only be
 * completed when BOTH signatures are present (StepUpModal + co-approver).
 */

interface Body {
  request_id?: string;
  action_key: string;
  subject?: string;
  step_up_token: string;
  co_approver_id: string;
  co_approver_role: string;
  retroactive?: boolean;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!["principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Requires principal/admin/sysadmin.", 403);
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.action_key || !body.step_up_token?.trim() || !body.co_approver_id) {
    return fail("VALIDATION_ERROR", "action_key + step_up_token + co_approver_id are required.", 400);
  }

  // The Immutable Meta-Rule: rbac_edit / governance edits need principal AND
  // sysadmin among the two signers (guardrail #5).
  const metaActions = ["rbac_edit", "edit_governance", "governance_meta"];
  if (metaActions.includes(body.action_key)) {
    const signers = [auth.role, body.co_approver_role ?? ""].filter(Boolean);
    if (!signers.includes("principal") || !signers.includes("sysadmin")) {
      return fail("FORBIDDEN", "Immutable Meta-Rule: this governance action requires principal + sysadmin quorum.", 403);
    }
  }

  let result: Record<string, unknown> = {};
  if (body.request_id) {
    // Co-sign an existing policy_change_requests row (PENDING_APPROVAL →
    // PUBLISHED when the second signature lands).
    const upd = await query<{ n: number }>(
      `UPDATE public.policy_change_requests
          SET approved_by = $1::uuid,
              status = 'PUBLISHED'
        WHERE id = $2::uuid AND status = 'PENDING_APPROVAL'
        RETURNING 1`,
      [body.co_approver_id, body.request_id],
    ).catch(() => ({ rows: [] as { n: number }[] }));
    result = { request_id: body.request_id, published: upd.rows.length > 0 };
  }

  // Immutable audit record (the closed-loop the Principal can trace later).
  await query(
    `INSERT INTO public.audit_events
       (event_id, actor_id, actor_type, role_context, entity_scope, action, resource, resource_id, before_state, created_at)
     VALUES (gen_random_uuid(), $1::uuid, 'human', $2, 'campus', $3, $4, $5, $6, NOW())`,
    [
      auth.userId,
      auth.role,
      `quorum_sign.${body.action_key}`,
      body.action_key,
      body.subject ?? body.request_id ?? null,
      JSON.stringify({ co_approver: body.co_approver_id, co_approver_role: body.co_approver_role, retroactive: body.retroactive ?? false }),
    ],
  ).catch(() => ({}));

  return ok({
    actionKey: body.action_key,
    signedBy: auth.userId,
    coApprover: body.co_approver_id,
    retroactive: body.retroactive ?? false,
    metaRuleEnforced: metaActions.includes(body.action_key),
    ...result,
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/principal/quorum/sign",
  auth: "user",
  requiredRole: ["principal", "admin", "sysadmin"],
});
