import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { withTransaction } from "@/lib/postgres";
import { addAudit } from "@/lib/db";

/**
 * PATCH /api/sysadmin/actions/[id]
 * Body: { decision: "approve" | "reject", note?: string }
 *
 * Flips a pending operator_actions row to approved or rejected. Approval
 * makes the row executable by scripts/apply-operator-action.sh (or the
 * auto-run path for risk=low). Reject records the reason. The decision is
 * audit-logged so the "who approved what, when" trail is intact.
 *
 * Only sysadmin/admin may decide, and only rows still in 'pending' can be
 * decided (an executed/expired row is immutable history).
 */
async function handlePatch(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const { auth } = ctx;
  const id = req.nextUrl.searchParams.get("id") ?? req.nextUrl.pathname.split("/").pop() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return fail("VALIDATION_ERROR", "invalid action id", 400);
  }
  const body = (await req.json().catch(() => ({}))) as { decision?: string; note?: string };
  const decision = body.decision;
  if (decision !== "approve" && decision !== "reject") {
    return fail("VALIDATION_ERROR", "decision must be 'approve' or 'reject'", 400);
  }
  const targetStatus = decision === "approve" ? "approved" : "rejected";

  const updated = await withTransaction(
    async (tx) => {
      const r = await tx.query(
        `UPDATE public.operator_actions
            SET status = $1,
                decided_at = NOW(),
                decided_by = $2::uuid,
                decision_note = $3
          WHERE id = $4::uuid
            AND status = 'pending'
          RETURNING id, kind, title, risk, status`,
        [targetStatus, auth.userId, body.note ?? null, id]
      );
      if (r.rowCount === 0) {
        const find = await tx.query(
          `SELECT status FROM public.operator_actions WHERE id = $1::uuid`,
          [id]
        );
        return find.rowCount === 0 ? { notFound: true as const } : { notPending: true as const, current: find.rows[0].status };
      }
      return { row: r.rows[0] as Record<string, unknown> };
    },
    { currentRole: auth.role, currentUserId: auth.userId }
  ).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .*operator_actions/i.test(msg)) {
      return { tableMissing: true as const };
    }
    throw err;
  });

  if (!updated || "notFound" in updated) {
    return fail("NOT_FOUND", "operator action not found", 404);
  }
  if ("tableMissing" in updated) {
    return fail("TABLE_MISSING", "operator_actions table not migrated", 503);
  }
  if ("notPending" in updated) {
    return fail("NOT_PENDING", `action already ${updated.current}; cannot decide`, 409);
  }

  const row = updated.row;
  await addAudit({
    action: "OPERATOR_ACTION_" + (decision === "approve" ? "APPROVED" : "REJECTED"),
    userId: auth.userId,
    role: auth.role,
    details: {
      operatorActionId: String(row.id),
      kind: String(row.kind),
      risk: String(row.risk),
      title: String(row.title),
      decision,
      note: body.note ?? null,
    },
  }).catch((err) => {
    console.error("[operator-actions] audit log write failed:", err);
  });

  return ok({
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    risk: String(row.risk),
    status: targetStatus,
    decision,
  });
}

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_actions_decide", maxRequests: 60 }
);
