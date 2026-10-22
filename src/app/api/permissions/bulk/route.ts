import { NextRequest, NextResponse } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import {
  validateAndApplyAction,
  type Actor,
  type TicketRow,
  type BulkResult,
} from "@/lib/bulk-permission";
import { getScopedTicket } from "@/lib/permission-workflow";
import { addAudit, addNotification } from "@/lib/db";
import type { Role } from "@/lib/types";

const BULK_MAX_TICKETS = 100;

function getBulkActor(req: NextRequest): Actor {
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = (req.headers.get("x-user-role") || "") as Role;
  const authUserEmail = req.headers.get("x-user-email") || "";
  const actorName = authUserEmail || authUserId || "Approver";
  return { id: authUserId, name: actorName, role: authUserRole };
}

function isTicketId(ticket: unknown): ticket is string {
  return typeof ticket === "string" && ticket.trim().length > 0;
}

function validateBulkBody(body: unknown): {
  ok: boolean;
  error?: { code: string; message: string };
  data?: { tickets: string[]; action: string; comment?: string };
} {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: { code: "BAD_REQUEST", message: "Request body is required" },
    };
  }

  const parsed = body as {
    tickets?: unknown;
    action?: unknown;
    comment?: unknown;
  };
  const tickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
  const action = typeof parsed.action === "string" ? parsed.action : undefined;
  const comment =
    typeof parsed.comment === "string" ? parsed.comment : undefined;

  if (tickets.length === 0) {
    return {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "tickets must be a non-empty array",
      },
    };
  }

  if (tickets.length > BULK_MAX_TICKETS) {
    return {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: `Maximum of ${BULK_MAX_TICKETS} tickets allowed per bulk request`,
      },
    };
  }

  if (!tickets.every(isTicketId)) {
    return {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "tickets array contains invalid ticket identifiers",
      },
    };
  }

  const validActions = [
    "APPROVE",
    "REJECT",
    "FORWARD",
    "ESCALATE",
    "COMPLETE",
  ];
  if (!action || !validActions.includes(action.toUpperCase())) {
    return {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: `Invalid action. Valid actions are: ${validActions.join(", ")}`,
      },
    };
  }

  if (action.toUpperCase() === "REJECT" && (!comment || comment.trim().length < 3)) {
    return {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "A comment with at least 3 characters is required for REJECT action",
      },
    };
  }

  return {
    ok: true,
    data: {
      tickets: tickets.map((t) => t.trim()),
      action: action.toUpperCase(),
      comment: comment?.trim(),
    },
  };
}

async function handlePost(req: NextRequest): Promise<Response> {
  const csrfFail = assertCsrf(req);
  if (csrfFail) return csrfFail;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }

  const validation = validateBulkBody(body);
  if (!validation.ok || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error || {
          code: "BAD_REQUEST",
          message: "Validation failed",
        },
      },
      { status: 400 }
    );
  }

  const { tickets, action, comment } = validation.data;
  const actor = getBulkActor(req);

  const supabase = getSupabaseServiceClient();

  // Fetch all tickets matching ticket numbers
  const { data: rows, error: fetchErr } = await supabase
    .from("permission_requests")
    .select("*")
    .in("ticket_number", tickets);

  if (fetchErr) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: fetchErr.message },
      },
      { status: 500 }
    );
  }

  const rowMap = new Map<string, TicketRow>();
  (rows || []).forEach((r) => {
    rowMap.set((r as TicketRow).ticket_number, r as TicketRow);
    rowMap.set((r as TicketRow).id, r as TicketRow);
  });

  const results: BulkResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const ticket of tickets) {
    const row = rowMap.get(ticket);
    if (!row) {
      results.push({
        ticket,
        status: "not_found",
        error: "Ticket not found",
      });
      failed++;
      continue;
    }

    // Check visibility scope
    const scope = await getScopedTicket(row.ticket_number, actor.id, actor.role);
    if ("notFound" in scope && scope.notFound) {
      results.push({
        ticket,
        status: "not_found",
        error: "Ticket not found",
      });
      failed++;
      continue;
    }
    if ("forbidden" in scope && scope.forbidden) {
      results.push({
        ticket,
        status: "forbidden",
        error: "Access denied to this ticket",
      });
      failed++;
      continue;
    }

    // Apply action
    const applyRes = await validateAndApplyAction({
      action,
      actor,
      comment,
      ticketRow: row,
    });

    if (!applyRes.ok) {
      const status =
        applyRes.conflict === "forbidden"
          ? "forbidden"
          : applyRes.conflict === "notPending"
          ? "not_pending"
          : applyRes.conflict === "notAllowed"
          ? "not_allowed"
          : applyRes.conflict === "concurrentModification"
          ? "skipped"  // G18: ticket was modified by another approver mid-batch
          : "error";

      results.push({
        ticket,
        status,
        error: applyRes.error || "Action could not be applied",
      });
      failed++;
      continue;
    }

    // Audit and Notification
    addAudit({
      action: `PERMISSION_BULK_${action}`,
      userId: actor.id,
      userName: actor.name,
      role: actor.role,
      details: {
        ticket: row.ticket_number,
        newStage: applyRes.newStage,
        newStatus: applyRes.newStatus,
        comment,
      },
    }).catch((err) =>
      console.error("[Permission Bulk] addAudit error for ticket", row.ticket_number, err)
    );

    addNotification(
      "user",
      row.student_user_id,
      "permission",
      `Bulk Action: ${action} for ${row.ticket_number}`,
      `Your permission request ${row.ticket_number} status updated to ${applyRes.newStatus}`
    ).catch((err) =>
      console.error(
        "[Permission Bulk] addNotification error for ticket",
        row.ticket_number,
        err
      )
    );

    results.push({
      ticket,
      status: "ok",
      newStage: applyRes.newStage,
    });
    succeeded++;
  }

  return NextResponse.json({
    success: true,
    data: {
      results,
      summary: {
        total: tickets.length,
        succeeded,
        failed,
      },
    },
  });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: [
      "caretaker",
      "deputy_warden",
      "hostel_manager",
      "principal",
      "principal",
      "vice_principal",
      "hod",
      "faculty",
      "oie",
      "operator",
      "admin",
      "sysadmin",
    ],
  }),
  {
    keyPrefix: "permission_bulk",
    maxRequests: 30,
  }
);
