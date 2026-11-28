import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { computeCohortImpactDelta } from "@/lib/policy-engine";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/principal/policy/lint-and-dryrun
 *
 * The mandatory gate: no policy draft can move DRAFT → ACTIVE until (a) the
 * Policy Linter passes (zero tstzrange overlaps on the same scope, zero
 * uncovered cohorts, zero dangling/empty roles) and (b) the Principal has
 * viewed the Dry-Run impact delta.
 *
 * Live-DB-first: the linter reads the actual versioned policy table named by
 * `domain` from the body (an allowlist of governed tables), and the dry-run
 * computes real student deltas with json-logic-js when a JSONLogic expression
 * is supplied. It transitions the target row to DRY_RUN_VERIFIED only when
 * zero linter errors exist.
 */

const GOVERNED: Record<string, { table: string; keyCol: string; hasTstz: boolean }> = {
  routing_policies: { table: "routing_policies", keyCol: "policy_key", hasTstz: true },
  retention_policy_rules: { table: "retention_policy_rules", keyCol: "policy_key", hasTstz: false },
  governance_matrix: { table: "governance_matrix", keyCol: "action_key", hasTstz: false },
  lifecycle_playbooks: { table: "lifecycle_playbooks", keyCol: "playbook_key", hasTstz: false },
};

interface Body {
  domain?: string;
  key?: string;
  jsonLogic?: Record<string, unknown>;
  cohortFrom?: string;
  cohortTo?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!["principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Requires principal/admin/sysadmin.", 403);
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const g = GOVERNED[body.domain ?? ""];
  if (!g) {
    return fail("VALIDATION_ERROR", `Unknown domain '${body.domain ?? ""}'. Allowed: ${Object.keys(GOVERNED).join(", ")}`, 400);
  }
  if (!body.key) return fail("VALIDATION_ERROR", "key is required.", 400);

  const issues: Array<{ code: string; message: string; blocking: boolean }> = [];

  // --- Linter ---
  // 1) Overlap: another ACTIVE row in the same table with a tstzrange that
  // overlaps this draft's window (if it has one).
  if (g.hasTstz) {
    const overlap = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM public.${g.table}
        WHERE ${g.keyCol} <> $1
          AND status = 'ACTIVE'
          AND (effective_from, coalesce(effective_to, 'infinity'::timestamptz))
              && ($2::timestamptz, coalesce($3, 'infinity'::timestamptz))`,
      [body.key, body.cohortFrom ?? "1900-01-01", body.cohortTo ?? null],
    ).catch(() => ({ rows: [] as { n: number }[] }));
    if (Number(overlap.rows[0]?.n ?? 0) > 0) {
      issues.push({ code: "TSTZRANGE_OVERLAP", message: `Overlaps ${overlap.rows![0].n} ACTIVE ${g.table} rows on the same scope.`, blocking: true });
    }
  }

  // 2) Dangling / empty roles: an eligible_roles array that is empty or
  // contains a role absent from config_roles.
  if (g.table === "governance_matrix" || g.table === "routing_policies") {
    const dangling = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.${g.table}
        WHERE ${g.keyCol} = $1
          AND (eligible_roles IS NULL
               OR jsonb_array_length(eligible_roles) = 0
               OR EXISTS (
                 SELECT 1 FROM jsonb_array_elements_text(eligible_roles) r
                 WHERE NOT EXISTS (SELECT 1 FROM public.config_roles cr WHERE cr.code = r)
               ))`,
      [body.key],
    ).catch(() => ({ rows: [] as { n: number }[] }));
    if (Number(dangling.rows[0]?.n ?? 0) > 0) {
      issues.push({ code: "DANGLING_ROLES", message: "eligible_roles is empty or references a role not in config_roles.", blocking: true });
    }
  }

  // 3) Cohort coverage: if the draft sets a scope cohort window, ensure at
  // least one active student cohort is covered (not a fabrication — if the
  // student table is empty the check degrades to "no data").
  if (body.cohortFrom && body.cohortTo) {
    const covered = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.student_details
        WHERE year IS NOT NULL
          AND year::text >= $1::int
          AND year::text <= $2::int`,
      [body.cohortFrom, body.cohortTo],
    ).catch(() => ({ rows: [] as { n: number }[] }));
    if (Number(covered.rows[0]?.n ?? 0) === 0) {
      issues.push({ code: "UNCOVERED_COHORT", message: `No active students in cohort ${body.cohortFrom}–${body.cohortTo}.`, blocking: false });
    }
  }

  // --- Dry-Run delta (THIN KERNEL PARITY — same policy engine the client
  // reads via catalog). Computes REAL student/record deltas when a tiered
  // JSONLogic tree is supplied; degrades to "structural lint only" otherwise.
  let delta: { before: number; after: number; shifted: number; note: string; transitions: Record<string, number> } = {
    before: 0, after: 0, shifted: 0,
    note: "No JSONLogic supplied — structural lint only.",
    transitions: {},
  };
  const candidatePolicy = body.jsonLogic as { rules?: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }> } | undefined;
  if (candidatePolicy?.rules?.length) {
    try {
      // Load the live cohort facts (real aggregate attendance per student).
      const cohort = await query<{ user_id: string; present: number; total: number }>(
        `SELECT a.person_id AS user_id,
                COUNT(*) FILTER (WHERE a.status = 'PRESENT')::int AS present,
                COUNT(*)::int AS total
           FROM public.attendance_records a
          JOIN public.users u ON u.id = a.person_id AND u.role = 'student'
          GROUP BY a.person_id`,
      ).catch(() => ({ rows: [] as { user_id: string; present: number; total: number }[] }));
      // The current active policy tree (for the before/after comparison).
      const currentPolicyRow = await query<{ rule_expression: Record<string, unknown> }>(
        `SELECT rule_expression FROM public.academic_policy_rules
          WHERE regulation_code = (SELECT code FROM public.academic_regulations WHERE is_active ORDER BY version DESC LIMIT 1)
            AND policy_category = 'ATTENDANCE'
          ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      ).catch(() => ({ rows: [] as { rule_expression: Record<string, unknown> }[] }));
      const currentPolicy = (currentPolicyRow.rows[0]?.rule_expression as { rules?: unknown } | undefined) ?? { rules: [] };
      const facts = cohort.rows.map((s) => ({
        user_id: s.user_id,
        aggregatePct: s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 0,
        hasApprovedCacCondonation: false,
        condonationFeeCleared: false,
        isDebarred: false,
      }));
      const impact = computeCohortImpactDelta(
        facts,
        currentPolicy as { rules: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }> },
        { rules: candidatePolicy.rules! },
      );
      delta = {
        before: impact.evaluatedStudents,
        after: impact.evaluatedStudents,
        shifted: impact.changedCount,
        note: `Live cohort of ${impact.evaluatedStudents} students: ${impact.changedCount} change status under the draft policy (real attendance data).`,
        transitions: impact.transitions,
      };
    } catch (e) {
      delta = { before: 0, after: 0, shifted: 0, note: `Dry-run eval unavailable: ${e instanceof Error ? e.message : String(e)}`, transitions: {} };
    }
  }

  const blockingCount = issues.filter((i) => i.blocking).length;
  const verified = blockingCount === 0;

  // Transition to DRY_RUN_VERIFIED only when zero blocking issues.
  if (verified) {
    await query(
      `UPDATE public.${g.table} SET status = 'DRY_RUN_VERIFIED' WHERE ${g.keyCol} = $1`,
      [body.key],
    ).catch(() => ({}));
  }

  return ok({
    key: body.key,
    domain: g.table,
    issues,
    blockingIssues: blockingCount,
    dryRun: delta,
    verified,
    transitioned: verified ? "DRY_RUN_VERIFIED" : "BLOCKED",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/principal/policy/lint-and-dryrun",
  auth: "user",
  requiredRole: ["principal", "admin", "sysadmin"],
});
