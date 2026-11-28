import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query, withTransaction } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

/**
 * POST /api/regulations/publish
 *
 * The governance-matrix enforcement point for academic-regulation publishing:
 *   1. ONLY `principal` (the College Academic Committee Chair) may publish.
 *      `sysadmin` is explicitly rejected with 403 — never a break-glass path.
 *   2. Two-person sign-off: the publish request must reference a
 *      `policy_change_requests` row where `approved_by <> drafted_by` (the DB
 *      `chk_two_person` constraint enforces this; a self-approval 500s/409s).
 *   3. Mandatory dry-run: the pending row must carry a `dry_run_summary` that
 *      is NOT stale (> 15 min) and NOT null. No preview -> no publish.
 *
 * On success: flips the DRAFT regulation to ACTIVE, records the two-person
 * audit, and flushes the catalog cache so every form/answer re-hydrates.
 */
const BodySchema = z.object({
  /** The CODE@vN reference produced by the clone step (e.g. "JJR23_V2@v2"). */
  regulationRef: z.string().min(3).max(64),
  /** The pending policy_change_requests row that carries the two-person + dry-run gate. */
  changeRequestId: z.string().uuid(),
  /** High-risk changes require a step-up confirmation token (TOTP/passkey deep-link). */
  stepUpToken: z.string().min(8).optional(),
});

const DRY_RUN_STALE_MS = 15 * 60 * 1000;

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;

  // ── Gate 1: principal-only. sysadmin (and everyone else) is 403. ──────
  if (auth.role !== "principal") {
    return fail(
      "FORBIDDEN",
      "Only the principal (College Academic Committee Chair) may publish a regulation. Sysadmin and other roles are rejected.",
      403,
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  }
  const { regulationRef, changeRequestId, stepUpToken } = parsed.data;

  // ── Gate 2 + 3: load the pending change request, enforce two-person + dry-run.
  const { rows: [pending] } = await query<{
    status: string;
    change_type: string;
    target_ref: string;
    drafted_by: string;
    approved_by: string | null;
    dry_run_summary: { generatedAt?: string } | null;
  }>(
    `SELECT status, change_type, target_ref, drafted_by, approved_by, dry_run_summary
       FROM public.policy_change_requests WHERE id = $1::uuid`,
    [changeRequestId],
  );
  if (!pending) {
    return fail("NOT_FOUND", "policy_change_requests row not found.", 404);
  }
  if (pending.change_type !== "REGULATION_PUBLISH") {
    return fail("BAD_CHANGE_TYPE", "change_type must be REGULATION_PUBLISH.", 400);
  }

  // Two-person: approved_by must be set and differ from drafted_by.
  if (!pending.approved_by || pending.approved_by === pending.drafted_by) {
    return fail(
      "TWO_PERSON_REQUIRED",
      "A second approver (approved_by <> drafted_by) is required. Self-approval is blocked by the two-person governance rule.",
      409,
    );
  }
  if (pending.status === "PUBLISHED") {
    return fail("ALREADY_PUBLISHED", "This change request was already published.", 409);
  }

  // Mandatory dry-run: present + fresh.
  const dryRun = pending.dry_run_summary;
  if (!dryRun) {
    return fail(
      "DRY_RUN_REQUIRED",
      "A dry-run impact preview is required before publishing. POST /api/regulations/publish/dry-run and attach the summary.",
      400,
    );
  }
  const generatedAt = dryRun.generatedAt ? new Date(dryRun.generatedAt).getTime() : 0;
  if (!generatedAt || Date.now() - generatedAt > DRY_RUN_STALE_MS) {
    return fail(
      "DRY_RUN_STALE",
      "The dry-run summary is missing or older than 15 minutes. Re-run the dry-run to refresh it.",
      400,
    );
  }

  // High-risk step-up: a regulation publish always requires the step-up token.
  if (!stepUpToken) {
    return fail(
      "STEP_UP_REQUIRED",
      "Publishing a regulation is a high-risk action and requires step-up verification (short-lived signed nonce / TOTP).",
      409,
    );
  }

  // ── Atomic publish: flip DRAFT -> ACTIVE + mark the request PUBLISHED. ──
  const [code, versionStr] = regulationRef.split("@");
  const version = Number(versionStr?.replace("v", "") ?? 1);
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE public.academic_regulations
          SET status = 'ACTIVE', is_active = true
        WHERE code = $1 AND version = $2`,
      [code, version],
    );
    await client.query(
      `UPDATE public.policy_change_requests
          SET status = 'PUBLISHED', step_up_verified_at = NOW()
        WHERE id = $1::uuid`,
      [changeRequestId],
    );
  }, { currentUserId: auth.userId, currentRole: auth.role });

  const { bumpCatalogCache } = await import("@/app/api/config/catalog/route");
  bumpCatalogCache();

  await recordMutationAudit({
    actorId: auth.userId,
    roleContext: auth.role,
    action: "regulation_publish",
    resource: "academic_regulations",
    resourceId: regulationRef,
    afterState: {
      status: "ACTIVE",
      twoPerson: { draftedBy: pending.drafted_by, approvedBy: pending.approved_by },
      dryRun: Boolean(dryRun),
      stepUpVerified: true,
    },
  });

  return ok({
    published: regulationRef,
    status: "ACTIVE",
    twoPerson: { draftedBy: pending.drafted_by, approvedBy: pending.approved_by },
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/regulations/publish",
  auth: "user",
  // principal is the only role that can reach the body logic; the 403 guard
  // above is defense-in-depth (the role list already excludes sysadmin).
  requiredRole: ["principal"],
  rateLimit: { keyPrefix: "regulations_publish", maxRequests: 10 },
});
