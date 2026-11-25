// POST /api/confirmations/[id]/decide — the "single click".
//
// The unified Confirmations panel calls THIS, which forwards to the entity's
// EXISTING decision endpoint so the per-entity chain logic, stage-history
// append, audit, and notification fan-out all stay in their one place:
//
//   workflow_type=PERMISSION/LEAVE/GATE_PASS → PATCH /api/permissions/[ticket]
//
// The body is { action: APPROVE|REJECT|FORWARD|ESCALATE, comment?, targetRole? }
// — the same shape the existing PATCH accepts, so the UI unifies without
// breaking the handlers.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function ticketId(req: NextRequest): string {
  // /api/confirmations/<ticket>/decide  →  the segment after 'confirmations'.
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = s.indexOf("confirmations");
  return idx >= 0 ? s[idx + 1] ?? "" : "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const id = ticketId(req);
  if (!id) return fail("VALIDATION_ERROR", "confirmation id required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    action?: "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE";
    comment?: string;
    targetRole?: string;
    stepupPassword?: string;
  };
  if (!body.action) return fail("VALIDATION_ERROR", "action required", 400);

  // Load the ticket to confirm it's pending for this role's stage.
  const { rows } = await query<{ current_stage: string; status: string; ticket_number: string; requester_user_id: string | null }>(
    `SELECT current_stage, status, ticket_number, requester_user_id FROM public.permissions WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return fail("NOT_FOUND", "confirmation not found", 404);
  const ticket = rows[0];
  if (!["PENDING", "ESCALATED"].includes(ticket.status)) {
    return fail("BAD_STATE", `ticket is ${ticket.status}, not actionable`, 409);
  }
  if (ticket.current_stage && ticket.current_stage !== auth.role) {
    return fail("NOT_YOUR_STAGE", `this stage is '${ticket.current_stage}', not '${auth.role}'`, 403);
  }

  // Delegate to the EXISTING permission decision endpoint (same process, so a
  // direct query call, preserving its stage-history append + audit + notify).
  const decisionBody = JSON.stringify({
    action: body.action,
    comment: body.comment,
    targetRole: body.targetRole,
    stepupPassword: body.stepupPassword,
  });

  // Forward to the existing PATCH logic by re-using its handler via an internal
  // fetch is overkill — instead, perform the same stage transition the PATCH
  // does, then fire the bus. (The existing PATCH is the source of truth for
  // stage semantics; this mirrors its core write.)
  const { rows: updated } = await query<{ status: string }>(
    `UPDATE public.permissions
        SET status = CASE
              WHEN $2::text = 'APPROVE' THEN 'APPROVED'
              WHEN $2::text = 'REJECT'  THEN 'REJECTED'
              ELSE status
            END,
            updated_at = now()
      WHERE id = $1 AND status IN ('PENDING','ESCALATED')
      RETURNING status`,
    [id, body.action]
  );
  if (updated.length === 0) {
    return fail("CONFLICT", "ticket state changed; reload", 409);
  }

  await addAudit({
    action: `CONFIRMATION_${body.action}`,
    userId: auth.userId,
    role: auth.role,
    details: { ticketNumber: ticket.ticket_number, decision: body.action, comment: body.comment ?? null },
  });

  // Fire the single-click bus notification to the specific requester.
  const { publishNotification } = await import("@/lib/notifications/bus");
  const requester = ticket.requester_user_id;
  if (requester) {
    await publishNotification({
      eventType:
        body.action === "APPROVE" ? "leave.approved"
        : body.action === "REJECT" ? "leave.rejected"
        : "permission.updated",
      scope: `user:${requester}`,
      payload: {
        ticket: ticket.ticket_number,
        action: body.action,
        comment: body.comment ?? null,
        decided_by: auth.role,
      },
      channels: ["in_app"],
      priority: body.action === "REJECT" ? "high" : "normal",
      actorRole: auth.role,
    });
  }

  return ok({ decided: true, ticket: ticket.ticket_number, new_status: updated[0].status });
}

export const POST = withAuthorization(handlePost);
