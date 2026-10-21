// src/app/api/cron/expire-passes/route.ts
// POST /api/cron/expire-passes — cron: cancel stale PENDING/ESCALATED tickets
// and expire APPROVED-but-unused tickets past their grace window.

import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";

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
    // 1. Cancel PENDING/ESCALATED tickets whose from_date passed 24h+ ago.
    const cancelled = await query<{ id: string; ticket_number: string }>(
      `UPDATE public.permissions
          SET status = 'CANCELLED',
              stage_history = stage_history || jsonb_build_array(
                jsonb_build_object('action','AUTO_CANCELLED','timestamp',NOW())
              ),
              updated_at = NOW()
        WHERE status IN ('PENDING','ESCALATED')
          AND from_date IS NOT NULL
          AND from_date < NOW() - INTERVAL '24 hours'
        RETURNING id, ticket_number`,
    );

    // 2. Expire APPROVED-but-unused tickets past to_date + grace.
    const expired = await query<{ id: string; ticket_number: string }>(
      `UPDATE public.permissions p
          SET status = 'EXPIRED',
              stage_history = p.stage_history || jsonb_build_array(
                jsonb_build_object('action','AUTO_EXPIRED','timestamp',NOW())
              ),
              updated_at = NOW()
        FROM public.config_exit_reasons c
        WHERE p.workflow_type = 'hostel'
          AND p.reason = c.code
          AND p.status = 'APPROVED'
          AND p.used_at IS NULL
          AND p.to_date IS NOT NULL
          AND p.to_date < NOW() - COALESCE(c.grace_minutes, 60) * INTERVAL '1 minute'
        RETURNING p.id, p.ticket_number`,
    );

    const systemUser = "00000000-0000-0000-0000-000000000000";
    for (const r of [...cancelled.rows, ...expired.rows]) {
      await addAudit({
        action: "PASS_AUTO_EXPIRED",
        userId: systemUser,
        details: { ticketNumber: r.ticket_number },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        cancelled: cancelled.rowCount ?? 0,
        expired: expired.rowCount ?? 0,
        cancelledTickets: cancelled.rows.map((r) => r.ticket_number),
        expiredTickets: expired.rows.map((r) => r.ticket_number),
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
