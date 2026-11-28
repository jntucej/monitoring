import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";
import { computeCohortImpactDelta } from "@/lib/policy-engine";

/**
 * GET /api/regulations/publish/dry-run
 *
 * Mandatory governance gate: before ANY regulation / threshold change is
 * published, the caller MUST run a dry-run impact preview against the live
 * cohort distribution and store the result on the pending
 * `policy_change_requests` row. `POST .../publish` rejects with 400 if the
 * dry_run_summary is missing or stale (> 15 min) — this is the "no publish
 * without a what-if" invariant from the governance matrix.
 *
 * Read-only: computes a status-distribution delta (Eligible <-> Condonation
 * <-> Detected) using the EXACT declarative policy trees (no parallel
 * hardcoded evaluator) and returns it for the principal's StepUpModal.
 *
 * Authority: principal, admin, oie (drafter side). Read-only, no writes.
 */
const DryRunBody = z.object({
  /** The proposed regulation code + version (the candidate tree). */
  candidateRegulationCode: z.string().min(1).max(32),
  candidateVersion: z.number().int().min(1).default(1),
  /** The regulation whose cohorts are being affected (the current tree). */
  sourceRegulationCode: z.string().min(1).max(32),
});

async function implDryRun(req: NextRequest, ctx: { auth: AuthContext }) {
  const parsed = DryRunBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  }
  const { candidateRegulationCode, candidateVersion, sourceRegulationCode } = parsed.data;

  // Pull both policy trees (JSONB) from the DB — zero hardcoded thresholds.
  const [curRes, candRes] = await Promise.all([
    query<{ expression: unknown }>(
      `SELECT rule_expression AS expression FROM public.academic_policy_rules
        WHERE regulation_code = $1 AND policy_category = 'ATTENDANCE' LIMIT 1`,
      [sourceRegulationCode],
    ),
    query<{ expression: unknown }>(
      `SELECT rule_expression AS expression FROM public.academic_policy_rules
        WHERE regulation_code = $1 AND policy_category = 'ATTENDANCE' AND version = $2
        LIMIT 1`,
      [candidateRegulationCode, candidateVersion],
    ).catch(() =>
      // Candidate tree may be in the cloned DRAFT regulation; fall back to the
      // latest version of that code when the exact version has no row yet.
      query<{ expression: unknown }>(
        `SELECT rule_expression AS expression FROM public.academic_policy_rules
          WHERE regulation_code = $1 AND policy_category = 'ATTENDANCE'
          ORDER BY created_at DESC LIMIT 1`,
        [candidateRegulationCode],
      ),
    ),
  ]);

  const current = curRes.rows[0]?.expression as
    | { rules: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }> }
    | undefined;
  const candidate = candRes.rows[0]?.expression as
    | { rules: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }> }
    | undefined;

  if (!current || !candidate) {
    return fail("NO_POLICY", "Could not load an attendance policy tree for the dry-run.", 404);
  }

  // Real cohort distribution: aggregate attendance for every student bound to
  // the source regulation (no fabricated numbers — empty cohort = empty delta).
  const { rows: cohort } = await query<{ present: number; total: number }>(
    `SELECT ar.person_id,
            COUNT(*) FILTER (WHERE ar.status = 'PRESENT')::int AS present,
            COUNT(*)::int AS total
       FROM public.attendance_records ar
       JOIN public.student_details sd ON sd.user_id = ar.person_id
      WHERE sd.regulation = $1
      GROUP BY ar.person_id
      HAVING COUNT(*) > 0`,
    [sourceRegulationCode],
  );

  const facts = cohort.map((r) => ({
    aggregatePct: Number(r.total) > 0 ? Number(((Number(r.present) / Number(r.total)) * 100).toFixed(2)) : 100,
    hasApprovedCacCondonation: false,
    condonationFeeCleared: false,
    isDebarred: false,
  }));

  const delta = computeCohortImpactDelta(facts, current, candidate);
  return ok({
    ...delta,
    sourceRegulationCode,
    candidateRef: `${candidateRegulationCode}@v${candidateVersion}`,
    generatedAt: new Date().toISOString(),
    note: "Store generatedAt + this summary on your policy_change_requests row; publish rejects a stale (>15 min) or missing dry-run.",
  });
}

export const GET = withApiChain(async (_req, ctx) => {
  // Dry-run is a POST-with-body in the spec; support GET for health probes.
  return ok({ note: "Use POST with {sourceRegulationCode, candidateRegulationCode, candidateVersion}." });
}, {
  route: "/api/regulations/publish/dry-run",
  auth: "user",
  requiredRole: ["principal", "admin", "oie"],
});

export const POST = withApiChain(implDryRun, {
  route: "/api/regulations/publish/dry-run",
  auth: "user",
  requiredRole: ["principal", "admin", "oie"],
  rateLimit: { keyPrefix: "regulations_dryrun", maxRequests: 30 },
});
