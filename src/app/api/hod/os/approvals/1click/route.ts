import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hod/os/approvals/1click — approve a routine faculty request.
 *
 * Only the governance-matrix actions that list 'hod' with a single approver
 * (class_reschedule, qa_promote) are 1-click here. Anything in the
 * quorum-locked set (edit_thresholds, publish_regulation, rbac_edit,
 * campus_lockdown, …) is NOT approved here — the UI routes those to the
 * StepUpModal + two-person quorum. This handler is the routine fast-path.
 */
const Body = z.object({
  requestId: z.string(),
  kind: z.enum(["class_reschedule", "lab_swap", "qa_promote"]),
  note: z.string().optional(),
});

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const { requestId, kind, note } = parsed.data;

  // Verify the action is actually in the HOD's 1-click governance scope
  // (governance_matrix eligible_roles JSONB array includes 'hod' AND
  //  required_approvers_count = 1).
  const scope = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM public.governance_matrix
      WHERE action_key = $1
        AND (eligible_roles @> '["hod"]'::jsonb)
        AND required_approvers_count = 1
        AND status = 'DRY_RUN_VERIFIED'`,
    [kind],
  ).catch(() => ({ rows: [{ n: 0 }] }));
  if (scope.rows[0]?.n === 0) {
    // Not in the HOD 1-click set → it's quorum-locked. Refuse here; the UI
    // must surface the QuorumGateModal + StepUpModal instead.
    return fail(
      "QUORUM_REQUIRED",
      `${kind} is not in the HOD 1-click scope — it requires the two-person quorum. Open the quorum gate instead.`,
    );
  }

  // Approve the underlying request (lab_swap / reschedule live in
  // faculty_leave_requests for the leave sub-case; reschedule via outbox).
  if (kind === "lab_swap") {
    await query(
      `UPDATE public.faculty_leave_requests SET status = 'APPROVED', approved_by = $1::uuid, approved_at = NOW() WHERE id = $2::uuid`,
      [auth.userId, requestId],
    );
  }
  // Emit an approval event to the outbox (the relay stamps the approval_card
  // + Telegram 1-click sync badge).
  await query(
    `INSERT INTO public.domain_outbox (event_type, payload, idempotency_key, status)
     VALUES ($1::text, $2::jsonb, $3, 'PENDING')`,
    [
      `HOD_1CLICK_APPROVAL:${kind}`,
      JSON.stringify({ kind, requestId, note, approvedBy: auth.userId, at: new Date().toISOString() }),
      `hod:1click:${kind}:${requestId}`,
    ],
  );

  return ok({ requestId, kind, approved: true, syncedVia: "@cej_server_bot" });
}

export const POST = withApiChain(implPost, {
  route: "/api/hod/os/approvals/1click",
  auth: "user",
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "hod_os_1click", maxRequests: 120 },
});
