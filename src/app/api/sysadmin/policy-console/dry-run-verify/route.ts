import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { withTransaction } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";
import { bumpCatalogCache } from "@/app/api/config/catalog/route";

/**
 * /api/sysadmin/policy-console/dry-run-verify — complete the dry-run step.
 *
 * After the operator runs a read-only dry-run (POST action=dry-run), they
 * click "Mark verified" to flip the row from DRAFT to DRY_RUN_VERIFIED and
 * attach the dryRunSummary. This is the gate the two-person publish step
 * then requires. The DB linter trigger re-validates the transition; a
 * violation returns 409 so the operator can fix the draft.
 */

const BodySchema = z.object({
  domain: z.enum([
    "routing_policies",
    "governance_matrix",
    "retention_policy_rules",
    "spatial_policies",
  ]),
  rowId: z.string().uuid(),
  dryRunSummary: z.record(z.string(), z.unknown()),
  approvedBy: z.string().uuid().optional(),
});

export const POST = withApiChain(
  async (req, ctx) => {
    const { auth } = ctx;
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail(
        "VALIDATION",
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        400,
      );
    }
    const { domain, rowId, dryRunSummary, approvedBy } = parsed.data;
    const approverId = approvedBy ?? auth.userId;

    try {
      await withTransaction(
        async (client) => {
          await client.query(
            `UPDATE public.${domain}
                SET status = 'DRY_RUN_VERIFIED',
                    dry_run_summary = $2::jsonb,
                    approved_by = $3::uuid,
                    approved_at = NOW()
              WHERE id = $1::uuid AND status = 'DRAFT'`,
            [rowId, JSON.stringify(dryRunSummary), approverId],
          );
        },
        { currentUserId: auth.userId, currentRole: auth.role },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("POLICY LINTER")) {
        return fail("LINTER_VIOLATION", `Dry-run verification blocked by the policy linter: ${msg}`, 409);
      }
      return fail("DRY_RUN_FAILED", msg, 500);
    }

    bumpCatalogCache();

    await recordMutationAudit({
      actorId: auth.userId,
      roleContext: auth.role,
      action: "policy_dry_run_verified",
      resource: domain,
      resourceId: rowId,
      afterState: { dryRun: dryRunSummary, approvedBy: approverId },
    });

    return ok({ rowId, domain, status: "DRY_RUN_VERIFIED", approvedBy: approverId });
  },
  {
    route: "/api/sysadmin/policy-console/dry-run-verify",
    auth: "user",
    requiredRole: ["sysadmin", "admin", "oie"],
    rateLimit: { keyPrefix: "policy_dry_run_verify", maxRequests: 20 },
  },
);
