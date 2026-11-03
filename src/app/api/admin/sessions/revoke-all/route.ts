import { NextRequest, NextResponse } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

/**
 * M5: POST /api/admin/sessions/revoke-all — creates a pending
 * operator_action for a fleet-wide session revocation. A different
 * sysadmin (not the requester) must approve it via
 * PATCH /api/sysadmin/actions/[id] before it executes. The executor
 * (apply-operator-action.sh) performs the actual version bump + session
 * revocation after approval.
 *
 * The route is guarded with `requiresStepUp: true` (M1) — the caller
 * must have re-entered their password within the last 5 minutes.
 */
async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    reason?: string;
    keepSelf?: boolean;
  };
  const reason = String(body.reason ?? "manual").slice(0, 500);
  const keepSelf = body.keepSelf === true;

  const insertRes = await query<{ id: string }>(
    `INSERT INTO public.operator_actions
       (kind, title, payload, risk, status, approver_role, source)
     VALUES ('revoke_all_sessions',
             'Revoke all sessions',
             $1::jsonb, 'high', 'pending', 'sysadmin', 'human')
     RETURNING id`,
    [
      JSON.stringify({
        requested_by: auth.userId,
        reason,
        keep_self: keepSelf,
      }),
    ],
  );
  const actionId = insertRes.rows[0]?.id ?? "";

  await addAudit({
    action: "OPERATOR_ACTION_PENDING_CREATED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: {
      kind: "revoke_all_sessions",
      actionId,
      reason,
      keepSelf,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    data: {
      pending: true,
      actionId,
      message: "Action created. A different sysadmin must approve it.",
    },
  });
}

export const POST = withMutationGuard(handlePost, {
  requiredRole: ["sysadmin"],
  requiresStepUp: true,
});
