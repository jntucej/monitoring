// src/app/api/sysadmin/actions/[id]/approve/route.ts
// M5 — Two-human approval entry point. A different sysadmin than the
// requester must POST here to flip a pending operator_action to 'approved'.
// The DB trigger (trg_operator_actions_no_self_approval) is the reliable
// enforcement; the app-level check gives a friendlier 403 + code.
// Guarded with `requiresStepUp: true` (M1) so the approver also re-enters
// their password within 5 minutes of clicking Approve.

import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withTransaction } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const id = req.nextUrl.searchParams.get("id") ??
    req.nextUrl.pathname.split("/").slice(-2, -1)[0];
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "invalid action id" } },
      { status: 400 },
    );
  }

  const result = await withTransaction(
    async (client) => {
      const lock = await client.query(
        `SELECT id, kind, status, payload->>'requested_by' AS requested_by_requested
           FROM public.operator_actions
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      if (lock.rows.length === 0) return { notFound: true as const };
    const row = lock.rows[0];
    if (row.status !== "pending") return { notPending: true as const, status: row.status };
    if (row.requested_by_requested === auth.userId) {
      return { selfApproval: true as const };
    }
    await client.query(
      `UPDATE public.operator_actions
          SET status = 'approved', decided_at = NOW(), decided_by = $1
        WHERE id = $2`,
      [auth.userId, id],
    );
    return { ok: true as const, kind: row.kind };
  });

  if (result.notFound) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Action not found" } },
      { status: 404 },
    );
  }
  if (result.selfApproval) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SELF_APPROVAL_FORBIDDEN",
          message: "You cannot approve an action you created",
        },
      },
      { status: 403 },
    );
  }
  if (result.notPending) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_PENDING",
          message: `Action is already ${result.status}`,
        },
      },
      { status: 409 },
    );
  }

  await addAudit({
    action: "OPERATOR_ACTION_APPROVED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: { actionId: id, kind: result.kind },
  }).catch(() => undefined);

  return NextResponse.json({ success: true, data: { approved: true, actionId: id } });
}

export const POST = withMutationGuard(handlePost, {
  requiredRole: ["sysadmin"],
  requiresStepUp: true,
  rateLimit: { windowMs: 60_000, maxRequests: 10, keyPrefix: "operator_action_approve" },
});
