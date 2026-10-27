// src/app/api/cron/sla-breach/route.ts
// POST /api/cron/sla-breach — cron: detect PENDING/ESCALATED tickets past their
// SLA deadline that have not yet been notified, and raise SLA_BREACHED events.

import { NextRequest, NextResponse } from "next/server";
import { query, addAudit, addNotification } from "@/lib/db";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "CRON_SECRET is not configured on server" } },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (secretHeader !== cronSecret && bearerToken !== cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized cron request" } },
      { status: 401 },
    );
  }

  try {
    const breached = await query<{
      id: string;
      ticket_number: string;
      current_stage: string;
      requester_user_id: string | null;
    }>(
      // NOTE: `student_user_id` does NOT exist on the base `permissions`
      // table (it is only an alias exposed by the permission_requests view,
      // where it maps to requester_user_id). Use requester_user_id here —
      // the audit/notification below keys off the ticket, and a null
      // requester is tolerated by addAudit/addNotification.
      `SELECT p.id, p.ticket_number, p.current_stage,
              p.requester_user_id
         FROM public.permissions p
        WHERE p.status IN ('PENDING','ESCALATED')
          AND p.sla_deadline IS NOT NULL
          AND p.sla_deadline < NOW()
          AND NOT EXISTS (
            SELECT 1 FROM public.audit_logs a
             WHERE a.action = 'SLA_BREACHED'
               AND a.details->>'ticketNumber' = p.ticket_number
          )
        LIMIT 200`,
    );

    for (const r of breached.rows) {
      await addAudit({
        action: "SLA_BREACHED",
        userId: r.requester_user_id ?? "",
        details: { ticketNumber: r.ticket_number, stage: r.current_stage },
      });
      await addNotification(
        "role",
        r.current_stage,
        "sla_breach",
        `SLA breached: ${r.ticket_number}`,
        `Ticket ${r.ticket_number} at ${r.current_stage} is past its SLA deadline.`,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        breached: breached.rowCount ?? 0,
        tickets: breached.rows.map((r) => r.ticket_number),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
