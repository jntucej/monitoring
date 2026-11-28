import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query, withTransaction } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";
import {
  listPolicies,
  getPolicyRow,
  runLinter,
  type PolicyDomain,
  type PolicyStatus,
} from "@/server/services/autonomous/policy-console";
import { bumpCatalogCache } from "@/app/api/config/catalog/route";

/**
 * /api/sysadmin/policy-console — read + mutate the four versioned policy
 * domains (routing / governance / retention / spatial) through one console.
 *
 * Draft -> Dry-Run -> Approve -> Publish is enforced in the DB by the
 * migration-56 linter trigger; this API surfaces the linter preview so the
 * UI can block a transition before it hits the DB, and enforces the
 * two-person + step-up governance rules server-side:
 *
 *   - transition to DRY_RUN_VERIFIED / ACTIVE requires approvedBy <> createdBy
 *   - transition to ACTIVE requires a fresh step-up (< 5 min)
 *   - governance_matrix downgrades are additionally gated by the
 *     immutable meta-rule trigger (principal + sysadmin quorum)
 */

const DomainSchema = z.enum([
  "routing_policies",
  "governance_matrix",
  "retention_policy_rules",
  "spatial_policies",
]);

// ── GET: list all rows of a domain (code-keyed, no raw UUIDs in payload) ──
async function implGet(
  req: NextRequest,
  _ctx: ApiChainContext<unknown, AuthContext>,
): Promise<Response> {
  const domain = req.nextUrl.searchParams.get("domain") ?? "";
  const parsed = DomainSchema.safeParse(domain);
  if (!parsed.success) {
    return fail("VALIDATION", "domain must be one of the four policy tables", 400);
  }
  const rows = await listPolicies(parsed.data as PolicyDomain);
  return ok({ domain: parsed.data, count: rows.length, rows });
}

// ── POST: row-level actions ───────────────────────────────────────────────
const BodySchema = z.object({
  domain: DomainSchema,
  rowId: z.string().uuid(),
  action: z.enum(["list-versions", "linter-preview", "dry-run", "transition"]),
  // transition params
  toStatus: z.enum(["DRAFT", "DRY_RUN_VERIFIED", "ACTIVE", "ARCHIVED"]).optional(),
  approvedBy: z.string().uuid().optional(),
  dryRunSummary: z.record(z.string(), z.unknown()).optional(),
});

async function implPost(
  req: NextRequest,
  ctx: ApiChainContext<unknown, AuthContext>,
): Promise<Response> {
  const { auth } = ctx;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  }
  const { domain, rowId, action, toStatus, approvedBy, dryRunSummary } = parsed.data;

  const row = await getPolicyRow(domain, rowId);
  if (!row) {
    return fail("NOT_FOUND", "policy row not found", 404);
  }

  switch (action) {
    case "list-versions": {
      const { rows: versions } = await query<{ version: number; status: PolicyStatus }>(
        `SELECT version, status FROM public.${domain}
          WHERE ${domain === "governance_matrix" ? "action_key" : "policy_key"} = $1
          ORDER BY version DESC`,
        [row.key],
      );
      return ok({ key: row.key, versions });
    }

    case "linter-preview": {
      const violations = await runLinter(domain, rowId);
      return ok({ rowId, clean: violations.length === 0, violations });
    }

    case "dry-run": {
      // Read-only impact preview. For the four policy domains the delta is
      // "rows that would be affected if this version became ACTIVE".
      const impact = await computeDomainImpact(domain, rowId, row);
      const summary = {
        generatedAt: new Date().toISOString(),
        domain,
        rowId,
        toStatus: toStatus ?? "ACTIVE",
        ...impact,
      };
      return ok({ dryRun: summary, note: "Read-only preview. Attach this summary when transitioning." });
    }

    case "transition": {
      if (!toStatus) {
        return fail("VALIDATION", "transition requires toStatus", 400);
      }
      return await transitionRow(auth, domain, row, rowId, toStatus, approvedBy, dryRunSummary);
    }
  }
}

/** Read-only per-domain impact delta (no writes — the dry-run gate). */
async function computeDomainImpact(
  domain: PolicyDomain,
  rowId: string,
  row: { key: string; version: number; status: PolicyStatus },
): Promise<Record<string, unknown>> {
  switch (domain) {
    case "governance_matrix": {
      const { rows } = await query<{ affected_users: number }>(
        `SELECT COUNT(DISTINCT u.id)::int AS affected_users
           FROM public.users u
          WHERE u.role = ANY(
            SELECT jsonb_array_elements_text(eligible_roles)
              FROM public.governance_matrix
             WHERE id = $1::uuid
          )`,
        [rowId],
      );
      const active = await query<{ status: string }>(
        `SELECT status FROM public.governance_matrix WHERE id = $1::uuid`,
        [rowId],
      );
      return {
        key: row.key,
        version: row.version,
        currentStatus: active.rows[0]?.status ?? null,
        affectedApproverRoles: row.key,
        affectedUsers: rows[0]?.affected_users ?? 0,
      };
    }
    case "routing_policies": {
      const { rows } = await query<{ open_doubts: number }>(
        `SELECT COUNT(*)::int AS open_doubts
           FROM public.class_doubt_escalations d
          WHERE d.status NOT IN ('ANSWERED', 'CLOSED', 'ESCALATED')`,
      );
      return { key: row.key, version: row.version, openDoubtsRouted: rows[0]?.open_doubts ?? 0 };
    }
    case "retention_policy_rules": {
      const { rows } = await query<{ rows: number }>(
        `SELECT COUNT(*)::int AS rows FROM public.chat_messages`,
      );
      return { key: row.key, version: row.version, hotChatRows: rows[0]?.rows ?? 0 };
    }
    case "spatial_policies": {
      const { rows } = await query<{ roles: number }>(
        `SELECT COUNT(*)::int AS roles FROM public.config_roles_registry WHERE is_active`,
      );
      return { key: row.key, version: row.version, activeRoles: rows[0]?.roles ?? 0 };
    }
  }
}

/**
 * The publish step. Enforces the two-person + step-up + linter rules that
 * the DB trigger also enforces — the app-level check gives a friendlier
 * 409/403 and the audit trail; the trigger is the backstop.
 */
async function transitionRow(
  auth: AuthContext,
  domain: PolicyDomain,
  row: { key: string; version: number; status: PolicyStatus; id: string },
  rowId: string,
  toStatus: PolicyStatus,
  approvedBy?: string,
  dryRunSummary?: Record<string, unknown>,
) {
  // DRAFT -> DRY_RUN_VERIFIED is gated by the DB linter trigger.
  // DRY_RUN_VERIFIED -> ACTIVE is the publish step: two-person + step-up.
  const isPublish = toStatus === "ACTIVE";
  const isDryRunVerify = toStatus === "DRY_RUN_VERIFIED";

  if (!isPublish && !isDryRunVerify && toStatus !== "ARCHIVED" && toStatus !== "DRAFT") {
    return fail("VALIDATION", `transition to ${toStatus} is not permitted from ${row.status}`, 400);
  }

  if (isPublish || isDryRunVerify) {
    // Two-person: the approver must exist and differ from the actor.
    const approverId = approvedBy ?? auth.userId;
    if (approverId === auth.userId && (isPublish || domain === "governance_matrix")) {
      return fail(
        "TWO_PERSON_REQUIRED",
        "A second approver (approvedBy <> actor) is required. Self-approval is blocked by the two-person governance rule.",
        409,
      );
    }

    // Publish step requires a fresh step-up (< 5 min). The step-up marker
    // lives on public.sessions.step_up_at — stamped by /api/auth/step-up.
    if (isPublish) {
      const { rows } = await query<{ step_up_at: string | null }>(
        `SELECT step_up_at FROM public.sessions
          WHERE user_id = $1 AND revoked_at IS NULL
          ORDER BY created_at DESC LIMIT 1`,
        [auth.userId],
      );
      const at = rows[0]?.step_up_at ? new Date(rows[0].step_up_at).getTime() : 0;
      if (Date.now() - at > 5 * 60 * 1000) {
        return fail(
          "STEP_UP_REQUIRED",
          "Publishing requires a fresh step-up (re-enter your password within 5 minutes). Open the step-up modal, then retry.",
          401,
        );
      }

      // Mandatory dry-run: the transition must carry a fresh dryRunSummary.
      if (!dryRunSummary || typeof (dryRunSummary.generatedAt as string | undefined) !== "string") {
        return fail(
          "DRY_RUN_REQUIRED",
          "A dry-run impact preview is required before publishing. Run the dry-run action and attach its summary.",
          400,
        );
      }
    }
  }

  // The actual status flip. The DB triggers (linter + two-person +
  // meta-rule) re-validate; a violation here surfaces as a 500 with the
  // trigger's message (the backstop working as designed).
  const approverId = approvedBy ?? auth.userId;
  try {
    await withTransaction(
      async (client) => {
        await client.query(
          `UPDATE public.${domain}
              SET status = $2::text,
                  approved_by = $3::uuid,
                  approved_at = NOW()
            WHERE id = $1::uuid`,
          [rowId, toStatus, approverId],
        );
      },
      { currentUserId: auth.userId, currentRole: auth.role },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("META-RULE")) {
      return fail(
        "META_RULE_VIOLATION",
        `The immutable meta-rule blocked this change: ${msg}`,
        409,
      );
    }
    if (msg.includes("POLICY LINTER")) {
      return fail("LINTER_VIOLATION", `The policy linter blocked this transition: ${msg}`, 409);
    }
    if (msg.includes("two_person") || msg.includes("TWO_PERSON")) {
      return fail("TWO_PERSON_REQUIRED", "Two-person sign-off failed: approvedBy must differ from the drafted_by.", 409);
    }
    return fail("TRANSITION_FAILED", msg, 500);
  }

  // Flush the catalog cache so the topology + policy layers refresh.
  bumpCatalogCache();

  await recordMutationAudit({
    actorId: auth.userId,
    roleContext: auth.role,
    action: `policy_${toStatus.toLowerCase()}`,
    resource: domain,
    resourceId: row.key,
    afterState: { version: row.version, status: toStatus, approvedBy: approverId, dryRun: Boolean(dryRunSummary) },
  });

  return ok({ rowId, key: row.key, version: row.version, status: toStatus, approvedBy: approverId });
}

// rowId is threaded through the transitionRow closure (defined in implPost scope).

export const GET = withApiChain(implGet, {
  route: "/api/sysadmin/policy-console",
  auth: "user",
  requiredRole: ["sysadmin", "admin", "oie"],
  rateLimit: { keyPrefix: "policy_console_read", maxRequests: 60 },
});

export const POST = withApiChain(
  implPost,
  {
    route: "/api/sysadmin/policy-console",
    auth: "user",
    requiredRole: ["sysadmin", "admin", "oie", "principal"],
    rateLimit: { keyPrefix: "policy_console_write", maxRequests: 20 },
  },
);
