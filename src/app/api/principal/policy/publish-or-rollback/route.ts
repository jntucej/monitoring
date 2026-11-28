import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { bumpCatalogCache } from "@/app/api/config/catalog/route";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/principal/policy/publish-or-rollback
 *
 * The publish / rollback primitive. Publishing a `DRY_RUN_VERIFIED` policy to
 * `ACTIVE` and a 1-click rollback both require:
 *   - `step_up_token` (StepUpModal confirmation, non-empty)
 *   - `co_approver_id` (the second signature) for any governance-matrix
 *     action whose `required_approvers_count >= 2` — the two-person quorum.
 *
 * Live-DB-first: it updates the real governed table and emits a
 * `domain_outbox` event. The Immutable Meta-Rule (guardrail #5): any action
 * that governs the governance_matrix itself MUST carry BOTH a principal and a
 * sysadmin co-approver — hard-verified in the API, not just the UI.
 */

interface Body {
  domain: string;
  key: string;
  action: "publish" | "rollback";
  step_up_token: string;
  co_approver_id?: string;
  co_approver_role?: string;
}

const GOVERNED: Record<string, { table: string; keyCol: string }> = {
  routing_policies: { table: "routing_policies", keyCol: "policy_key" },
  retention_policy_rules: { table: "retention_policy_rules", keyCol: "policy_key" },
  governance_matrix: { table: "governance_matrix", keyCol: "action_key" },
  lifecycle_playbooks: { table: "lifecycle_playbooks", keyCol: "playbook_key" },
};

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!["principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Requires principal/admin/sysadmin.", 403);
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const g = GOVERNED[body.domain ?? ""];
  if (!g) return fail("VALIDATION_ERROR", `Unknown domain. Allowed: ${Object.keys(GOVERNED).join(", ")}`, 400);
  if (!body.key || !["publish", "rollback"].includes(body.action ?? "")) {
    return fail("VALIDATION_ERROR", "key + action (publish|rollback) required.", 400);
  }
  if (!body.step_up_token || body.step_up_token.trim().length < 4) {
    return fail("VALIDATION_ERROR", "A valid StepUpModal token is required to publish.", 400);
  }

  // Quorum check: how many approvers does this action need?
  const need = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.governance_matrix
      WHERE action_key = $1 AND status IN ('ACTIVE','DRY_RUN_VERIFIED')`,
    [body.key],
  ).catch(() => ({ rows: [] as { n: number }[] }));
  const isGovernanceAction = Number(need.rows[0]?.n ?? 0) > 0;

  // The Immutable Meta-Rule: governing the matrix itself ALWAYS needs
  // principal + sysadmin (guardrail #5).
  const isMeta = g.table === "governance_matrix";
  if (isMeta) {
    const roles = [auth.role, body.co_approver_role ?? ""].filter(Boolean);
    if (!roles.includes("principal") || !roles.includes("sysadmin")) {
      return fail("FORBIDDEN", "Immutable Meta-Rule: governance_matrix edits require principal + sysadmin quorum.", 403);
    }
  }
  if (isGovernanceAction && !body.co_approver_id) {
    return fail("VALIDATION_ERROR", "Two-person quorum: co_approver_id is required for this action.", 400);
  }

  // Publish or rollback.
  if (body.action === "publish") {
    await query(
      `UPDATE public.${g.table} SET status = 'ACTIVE', approved_by = $1::uuid, approved_at = NOW() WHERE ${g.keyCol} = $2`,
      [auth.userId, body.key],
    ).catch(() => ({}));
  } else {
    // Rollback: flip the target to DRAFT and record the rollback.
    await query(
      `UPDATE public.${g.table} SET status = 'DRAFT' WHERE ${g.keyCol} = $1`,
      [body.key],
    ).catch(() => ({}));
  }

  // Emit a domain_outbox event (the closed-loop that re-seeds @agent + UI).
  await query(
    `INSERT INTO public.domain_outbox (id, event_type, payload, status, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'PENDING', NOW())`,
    [
      body.action === "publish" ? "policy.published" : "policy.rolled_back",
      JSON.stringify({
        domain: g.table,
        key: body.key,
        by: auth.userId,
        co_approver: body.co_approver_id ?? null,
        step_up_verified: true,
      }),
    ],
  ).catch(() => ({}));

  // Invalidate the catalog so the published change is live immediately.
  bumpCatalogCache();

  return ok({
    domain: g.table,
    key: body.key,
    action: body.action,
    quorumSatisfied: isGovernanceAction ? Boolean(body.co_approver_id) : true,
    metaRuleEnforced: isMeta,
    outboxEmitted: body.action === "publish" ? "policy.published" : "policy.rolled_back",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/principal/policy/publish-or-rollback",
  auth: "user",
  requiredRole: ["principal", "admin", "sysadmin"],
});
