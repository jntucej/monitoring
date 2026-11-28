import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

/**
 * POST /api/sysadmin/regulations/clone
 *
 * 1-click "Clone & Edit": fork a regulation (e.g. JJR23 -> JJR23_V2) as a
 * DRAFT with a bumped version + deep-copied JSONLogic policy trees, WITHOUT
 * touching the source regulation or any bound cohort. Grandfathered batches
 * keep running on the original; the clone is activated by a separate
 * publish step (out of scope here).
 *
 * Calls the `clone_academic_regulation()` SQL function (created in migration
 * 51) + flushes the in-process catalog cache so the topology layer refreshes.
 * Authority: sysadmin (break-glass) or admin.
 */
const BodySchema = z.object({
  sourceRegulationCode: z.string().min(1).max(32),
  newRegulationCode: z.string().min(1).max(32),
  newEffectiveYear: z.number().int().min(2000).max(2100),
});

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  }
  const { sourceRegulationCode, newRegulationCode, newEffectiveYear } = parsed.data;

  if (sourceRegulationCode === newRegulationCode) {
    return fail("VALIDATION", "new code must differ from the source code", 400);
  }

  // The clone function is idempotent-safe: it raises if the source is missing.
  // Returns a "CODE@vN" reference (the lean academic_regulations table has no
  // UUID PK, so the new regulation is addressed by code + version).
  let cloneRef: string;
  try {
    const { rows } = await query<{ ref: string }>(
      `SELECT public.clone_academic_regulation($1, $2, $3) AS ref`,
      [sourceRegulationCode, newRegulationCode, newEffectiveYear],
    );
    cloneRef = rows[0]?.ref ?? "";
  } catch (err) {
    return fail(
      "CLONE_FAILED",
      `Could not clone regulation: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }
  if (!cloneRef) {
    return fail("CLONE_FAILED", "Clone did not return a regulation reference.", 500);
  }

  // Flush the in-process catalog cache so the topology + active_regulations
  // layer reflects the new draft immediately (same convention as /topology).
  const { bumpCatalogCache } = await import("@/app/api/config/catalog/route");
  bumpCatalogCache();

  await recordMutationAudit({
    actorId: auth.userId,
    roleContext: auth.role,
    action: "regulation_clone",
    resource: "academic_regulations",
    resourceId: cloneRef,
    afterState: { source: sourceRegulationCode, clonedTo: newRegulationCode, effectiveYear: newEffectiveYear, status: "DRAFT" },
  });

  return ok({
    clonedFrom: sourceRegulationCode,
    newRegulationCode,
    regulationRef: cloneRef,
    status: "DRAFT",
    note: "Clone created as DRAFT. Deep-copied the policy JSONB trees; the source + bound cohorts are untouched.",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/regulations/clone",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "regulations_clone", maxRequests: 20 },
});
