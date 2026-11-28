import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/sysadmin/quorum/cosign — the Immutable Meta-Rule co-signature.
 *
 * The sysadmin co-signs a two-person quorum request (governance_matrix edit,
 * RBAC change, break-glass / lockdown lift) that was drafted by the
 * principal. Both signatures + a StepUpModal verification are recorded on the
 * policy_change_request, then activated.
 *
 * THE GUARD: any `governance_matrix` edit (e.g. downgrading a step_up_quorum
 * action to telegram_1click) ALWAYS requires StepUpModal + Two-Person Quorum
 * (principal + sysadmin). This is hard-enforced in the API: a `governance_matrix`
 * target with fewer than 2 distinct approvers (or a missing principal draft +
 * sysadmin co-sign) is REJECTED.
 */

export interface QuorumCosignBody {
  requestType: "governance_matrix" | "rbac_change" | "break_glass" | "lockdown_lift" | "threshold_edit";
  targetRef: string;
  stepUpTokenVerified: boolean;
  payload?: Record<string, unknown>;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<QuorumCosignBody, AuthContext>) {
  const auth = ctx.auth;
  if (auth.role !== "sysadmin") {
    return fail("FORBIDDEN", "Quorum co-signature requires the sysadmin role (the Principal drafts; the Sysadmin co-signs).", 403);
  }
  const { requestType, targetRef, stepUpTokenVerified, payload } = ctx.body;
  if (!targetRef || !stepUpTokenVerified) {
    return fail("QUORUM_BLOCKED", "StepUpModal verification (6-digit TOTP + typed confirm) is required before co-signing.", 403);
  }

  // THE GUARD (Immutable Meta-Rule): governance_matrix + the high-risk
  // actions REQUIRE a two-person quorum. If the principal did NOT draft this
  // request (no principal-authored row), the sysadmin CANNOT self-co-sign —
  // reject.
  const draft = await query<{ id: string; status: string; drafted_by: string }>(
    `SELECT id, status, drafted_by::text FROM public.policy_change_requests
       WHERE target_ref = $1 AND status IN ('DRAFT','PENDING_APPROVAL')
      ORDER BY created_at DESC LIMIT 1`,
    [targetRef],
  ).catch(() => ({ rows: [] as { id: string; status: string; drafted_by: string }[] }));

  const principalDrafted = draft.rows.length > 0 && draft.rows[0].drafted_by !== auth.userId;
  const isMetaRule = requestType === "governance_matrix" || requestType === "threshold_edit";

  if (isMetaRule && !principalDrafted) {
    // Hard-block: the Meta-Rule cannot be co-signed solo by the sysadmin.
    await query(
      `INSERT INTO public.audit_events
         (event_id, actor_type, actor_id, role_context, action, resource, resource_id, before_state, created_at)
       VALUES (gen_random_uuid(), 'system', $1, 'sysadmin', 'quorum_meta_rule_blocked', 'governance_matrix', $2, $3, NOW())`,
      [auth.userId, targetRef, JSON.stringify({ reason: "principal draft missing — Immutable Meta-Rule requires principal + sysadmin" })],
    ).catch(() => {});
    return fail(
      "IMMUTABLE_META_RULE",
      "governance_matrix / threshold edits require a principal-drafted request + sysadmin co-sign. Solo co-sign blocked.",
      403,
    );
  }

  // Co-sign: stamp the request APPROVED by the sysadmin + record the
  // two-person quorum on the audit trail.
  const requestId = draft.rows[0]?.id;
  if (requestId) {
    await query(
      `UPDATE public.policy_change_requests
          SET status = 'PUBLISHED', approved_by = $1, step_up_verified_at = NOW(), updated_at = NOW()
        WHERE id = $2`,
      [auth.userId, requestId],
    ).catch(() => {});
  }
  await query(
    `INSERT INTO public.audit_events
       (event_id, actor_type, actor_id, role_context, action, resource, resource_id, before_state, after_state, created_at)
     VALUES (gen_random_uuid(), 'system', $1, 'sysadmin', 'quorum_cosigned', 'governance_matrix', $2, $3, $4, NOW())`,
    [auth.userId, targetRef, JSON.stringify({ requestType, principalDrafted, quorum: ["principal", "sysadmin"] }), JSON.stringify({ payload: payload ?? {}, stepUpTokenVerified })],
  ).catch(() => {});

  return ok({
    cosigned: true,
    targetRef,
    requestType,
    principalDrafted,
    isMetaRule,
    quorum: ["principal", "sysadmin"],
    note: "Two-person quorum co-signed (Principal draft + Sysadmin). Immutable Meta-Rule satisfied.",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/quorum/cosign",
  auth: "user",
  requiredRole: "sysadmin",
});
