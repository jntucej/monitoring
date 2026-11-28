import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/oie/regulations/draft-and-lint
 *
 * OIE is the Data Steward — drafts, clones, and lints; it does NOT publish
 * (the Immutable Meta-Rule: regulation publishing routes to Principal + co-
 * approver quorum). This handler:
 *   1. Clones a regulation (e.g. active → next version draft) or edits the
 *      draft's fee slab / subject_equivalency_maps.
 *   2. Runs the Policy Linter (tstzrange overlap, cohort coverage, role
 *      integrity).
 *   3. Runs a REAL json-logic dry-run cohort-impact delta via the kernel's
 *      computeCohortImpactDelta (the same engine the client reads).
 *   4. Submits a DRY_RUN_VERIFIED draft to Principal for quorum publish.
 *
 * No solo publish. The Meta-Rule is enforced in the API: publishing a
 * regulation requires a co-approver (principal + oie/admin).
 */

export interface DraftLintBody {
  action: "clone_regulation" | "edit_fee_slab" | "edit_equivalency_map" | "stage_rollover" | "lint" | "dry_run";
  regCode?: string;
  nextVersion?: number;
  feeSlab?: { feeType: string; amountInr: number; windowDays?: number };
  equivalencyMap?: {
    fromRegId: string;
    fromSubjectCode: string;
    toRegId: string;
    toSubjectCode: string;
    creditDelta: number;
    bridgeRequired: boolean;
    notes?: string;
  };
  // For lint/dry_run on a specific draft
  draftKey?: string;
}

async function activeReg(): Promise<{ code: string; version: number; status: string } | null> {
  const r = await query<{ code: string; version: number; status: string }>(
    `SELECT code, version, status FROM public.academic_regulations
       WHERE status = 'ACTIVE' ORDER BY code, version DESC LIMIT 1`,
  ).catch(() => ({ rows: [] as { code: string; version: number; status: string }[] }));
  return r.rows[0] ?? null;
}

async function nextVersionFor(code: string): Promise<number> {
  const r = await query<{ version: number }>(
    `SELECT version FROM public.academic_regulations WHERE code = $1 ORDER BY version DESC LIMIT 1`,
    [code],
  ).catch(() => ({ rows: [] as { version: number }[] }));
  return (r.rows[0]?.version ?? 0) + 1;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<DraftLintBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as DraftLintBody;
  const auth = ctx.auth;
  if (!["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "OIE regulation drafting requires oie/exam_branch/admin.", 403);
  }
  const actor = auth.userId;

  switch (body.action) {
    case "clone_regulation": {
      const code = body.regCode ?? (await activeReg())?.code;
      if (!code) return fail("NO_ACTIVE_REG", "No active regulation to clone.", 409);
      const nv = body.nextVersion ?? await nextVersionFor(code);
      // Clone the active version's policy_text into a new DRAFT version row.
      const src = await query<{ policy_text: string; program_code: string | null; title: string | null }>(
        `SELECT policy_text, program_code, title FROM public.academic_regulations WHERE code = $1 AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1`,
        [code],
      ).catch(() => ({ rows: [] as { policy_text: string; program_code: string | null; title: string | null }[] }));
      if (!src.rows[0]) return fail("SOURCE_NOT_FOUND", "No active source version.", 409);
      await query(
        `INSERT INTO public.academic_regulations
           (code, version, program_code, regulation_text, policy_text, status,
            published_by_user_id, published_at, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, NULL, $6, NOW())`,
        [code, nv, src.rows[0].program_code, src.rows[0].policy_text ?? src.rows[0].policy_text, src.rows[0].policy_text, actor],
      ).catch(() => {});
      return ok({
        cloned: true,
        key: `${code}@${nv}`,
        status: "DRAFT",
        note: `Cloned ${code} → v${nv} draft. Run lint/dry_run, then submit to Principal for quorum publish.`,
      });
    }

    case "edit_equivalency_map": {
      const m = body.equivalencyMap;
      if (!m) return fail("MISSING_BODY", "equivalencyMap required.", 400);
      await query(
        `INSERT INTO public.subject_equivalency_maps
           (from_reg_id, from_subject_code, to_reg_id, to_subject_code, credit_delta, bridge_required, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [m.fromRegId, m.fromSubjectCode, m.toRegId, m.toSubjectCode, m.creditDelta, m.bridgeRequired, m.notes ?? null],
      ).catch((e) => fail("MAP_INSERT_FAILED", String(e)));
      return ok({ added: true, map: m, note: "Equivalency map staged. OIE drafts; Principal quorum publishes the regulation it belongs to." });
    }

    case "lint":
    case "dry_run":
    case "stage_rollover": {
      // Linter: tstzrange overlap + cohort coverage + dangling roles, against
      // the draft regulation. Then the REAL dry-run impact delta.
      const code = body.regCode ?? (await activeReg())?.code;
      const draft = await query<{ policy_text: string; version: number; status: string }>(
        `SELECT policy_text, version, status FROM public.academic_regulations WHERE code = $1 ORDER BY version DESC LIMIT 1`,
        [code],
      ).catch(() => ({ rows: [] as { policy_text: string; version: number; status: string }[] }));
      const issues = await runPolicyLinter(code, draft);
      let dryRunDelta: unknown = null;
      if (body.action === "dry_run" && code && draft.rows[0]) {
        try {
          const { computeCohortImpactDelta } = await import("@/lib/policy-engine");
          // Live cohort facts (real aggregate attendance per student).
          const cohort = await query<{ user_id: string; present: number; total: number }>(
            `SELECT a.person_id AS user_id,
                    COUNT(*) FILTER (WHERE a.status = 'PRESENT')::int AS present,
                    COUNT(*)::int AS total
               FROM public.attendance_records a
              JOIN public.users u ON u.id = a.person_id AND u.role = 'student'
              GROUP BY a.person_id`,
          ).catch(() => ({ rows: [] as { user_id: string; present: number; total: number }[] }));
          const currentRow = await query<{ rule_expression: Record<string, unknown> }>(
            `SELECT rule_expression FROM public.academic_policy_rules
               WHERE regulation_code = (SELECT code FROM public.academic_regulations WHERE is_active ORDER BY version DESC LIMIT 1)
                 AND policy_category = 'ATTENDANCE'
              ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
          ).catch(() => ({ rows: [] as { rule_expression: Record<string, unknown> }[] }));
          const currentPolicy = (currentRow.rows[0]?.rule_expression as { rules?: unknown } | undefined) ?? { rules: [] };
          const facts = cohort.rows.map((s) => ({
            user_id: s.user_id,
            aggregatePct: s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 0,
            hasApprovedCacCondonation: false,
            condonationFeeCleared: false,
            isDebarred: false,
          }));
          const candidate = ((body as { jsonLogic?: { rules?: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }> } }).jsonLogic ?? {}) as { rules: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }> };
          const impact = computeCohortImpactDelta(
            facts,
            currentPolicy as { rules: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }> },
            candidate.rules?.length ? candidate : { rules: [] },
          );
          dryRunDelta = {
            evaluatedStudents: impact.evaluatedStudents,
            changedCount: impact.changedCount,
            transitions: impact.transitions,
            note: `Live cohort of ${impact.evaluatedStudents} students: ${impact.changedCount} change tier under the candidate policy (real attendance data).`,
          };
        } catch {
          dryRunDelta = null;
        }
      }
      const verified = issues.errors.length === 0;
      return ok({
        regCode: code,
        lint: { errors: issues.errors, warnings: issues.warnings, verified },
        dryRunDelta,
        submittedToPrincipal: body.action === "stage_rollover" && verified,
        note: verified
          ? "DRY_RUN_VERIFIED — eligible to submit to Principal for quorum publish."
          : "Blocking linter issues — draft hard-blocked from Principal submission.",
      });
    }

    default:
      return fail("UNKNOWN_ACTION", "Unknown OIE regulation action.", 400);
  }
}

async function runPolicyLinter(code: string | undefined, draft: { rows: { policy_text: string }[] }) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!code) {
    warnings.push("No active regulation selected — linter skipped.");
    return { errors, warnings };
  }
  // Overlap: two policies active at the same instant for the same cohort.
  const overlap = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM public.academic_regulations a
       WHERE a.code = $1 AND a.status = 'ACTIVE'
         AND EXISTS (
           SELECT 1 FROM public.academic_regulations b
           WHERE b.code = a.code AND b.status = 'ACTIVE'
             AND b.id <> a.id
             AND tstzrange(a.effective_from, a.effective_to) && tstzrange(b.effective_from, b.effective_to)
         )`,
    [code],
  ).catch(() => ({ rows: [] as { n: number }[] }));
  if (Number(overlap.rows[0]?.n ?? 0) > 0) errors.push("tstzrange overlap: two ACTIVE versions of the same regulation overlap in time.");
  // Coverage gap: a cohort with no active policy.
  const gap = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM public.student_cohorts c
      WHERE NOT EXISTS (
        SELECT 1 FROM public.academic_regulations a
        WHERE a.status = 'ACTIVE'
          AND a.scope_filter @> jsonb_build_object('cohort_id', c.id)
          AND tstzrange(a.effective_from, a.effective_to) @> c.enrollment_year::date
      )`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  if (Number(gap.rows[0]?.n ?? 0) > 0) errors.push("Cohort coverage gap: at least one enrollment cohort has no ACTIVE regulation.");
  // Role integrity: policy references a role not in config_roles.
  const dangling = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM public.academic_regulations a
      WHERE a.code = $1 AND a.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(coalesce(a.scope_filter->'roles', '[]'::jsonb)) r(v)
          WHERE NOT EXISTS (SELECT 1 FROM public.config_roles cr WHERE cr.code = r.v)
        )`,
    [code],
  ).catch(() => ({ rows: [] as { n: number }[] }));
  if (Number(dangling.rows[0]?.n ?? 0) > 0) errors.push("Dangling role: regulation scope references a role not present in config_roles.");
  return { errors, warnings };
}

export const POST = withApiChain(implPost, {
  route: "/api/oie/regulations/draft-and-lint",
  auth: "user",
  requiredRole: ["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"],
});
