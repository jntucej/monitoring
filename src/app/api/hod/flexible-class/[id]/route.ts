// /api/hod/flexible-class/[id]/route.ts
// HOD approve/reject a pending class_flexible request (reschedule/substitute).
// Extra classes are auto-approved; reschedule + substitute need HOD sign-off.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function implPatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "ID required", 400);

  const allowed = ["hod", "principal", "admin", "sysadmin", "vice_principal", "dean"];
  if (!allowed.includes(auth.role)) {
    return fail("FORBIDDEN", "HOD or above required", 403);
  }

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    reason?: string;
  };
  const action = (body.action ?? "").toLowerCase();
  if (!["approve", "reject"].includes(action)) {
    return fail("VALIDATION_ERROR", "action must be 'approve' or 'reject'", 400);
  }

  const { rows: reqRows } = await query<{
    id: string; type: string; class_id: string; session_date: string;
    period_no: number; created_by: string; approval_state: string;
  }>(
    `SELECT id, type, class_id, session_date, period_no, created_by, approval_state
       FROM public.class_flexible WHERE id = $1`,
    [id],
  );
  const flex = reqRows[0];
  if (!flex) return fail("NOT_FOUND", "Flexible class request not found", 404);
  if (flex.approval_state !== "pending") {
    return fail("ALREADY_PROCESSED", `Already ${flex.approval_state}`, 400);
  }

  // HOD scope lock
  if (auth.role === "hod") {
    const { rows: deptRows } = await query<{ class_dept: string }>(
      `SELECT c.department_id::text AS class_dept
         FROM public.classes c WHERE c.id = $1`,
      [flex.class_id],
    );
    const classDept = deptRows[0]?.class_dept;
    if (classDept && classDept !== String(auth.departmentId)) {
      return fail("FORBIDDEN", "Not your department", 403);
    }
  }

  const newState = action === "approve" ? "approved" : "rejected";
  await query(
    `UPDATE public.class_flexible
        SET approval_state = $2, approver_id = $3, approved_at = now(),
            reject_reason = $4
      WHERE id = $1`,
    [id, newState, auth.userId, action === "reject" ? body.reason ?? null : null],
  );

  await query(
    `INSERT INTO public.audit_events
       (actor_id, actor_type, role_context, action, resource, resource_id, after_state)
     VALUES ($1, 'user', $2, 'class_flexible_' || $3, 'class_flexible', $4, $5)`,
    [auth.userId, auth.role, action, id, JSON.stringify({ type: flex.type, result: newState, reason: body.reason ?? null })],
  ).catch(() => undefined);

  // Notify the requesting faculty
  const { rows: requesterRows } = await query<{ name: string; chat_id: number | null }>(
    `SELECT name, telegram_chat_id AS chat_id FROM public.users WHERE id = $1`,
    [flex.created_by],
  );
  if (requesterRows[0]?.chat_id) {
    const { sendTelegramMessage } = await import("@/lib/telegram");
    const msg =
      newState === "approved"
        ? `Approved: ${flex.type} for P${flex.period_no} on ${flex.session_date}. Your register will open at period start.`
        : `Rejected: ${flex.type} for P${flex.period_no} on ${flex.session_date}. Reason: ${body.reason ?? "not given"}`;
    await sendTelegramMessage(requesterRows[0].chat_id, msg, { parseMode: "Markdown" }).catch(() => undefined);
  }

  return ok({ id, action: newState, reason: body.reason ?? null });
}

export const PATCH = withApiChain(implPatch, {
  route: "/api/hod/flexible-class/[id]",
  auth: "user",
  csrf: true,
  requiredRole: ["hod", "principal", "admin", "sysadmin", "vice_principal", "dean"],
  rateLimit: { keyPrefix: "hod-flex-approval", maxRequests: 30, windowMs: 60_000 },
});
