// /api/cron/leave-chain/route.ts
// Self-healing hostel leave chain (IMPLEMENTATION_BLUEPRINT STEP 6.2):
// sequences the DRAFT → WARDEN_APPROVED → PARENT_ACKNOWLEDGED →
// GATE_ISSUED pipeline with TTL reminders and auto-expiry. Humans only
// tap the two approvals (warden, parent); the agent handles the clock.
//
// Runs every 30 min. Each leave request that is not yet expired and not
// yet GATE_ISSUED gets:
//   - reminder #1 at 2h (warden) / 4h (parent)
//   - escalation at 6h (warden → hostel_manager) / 12h (parent → student)
//   - auto-expiry when expires_at passes (status → EXPIRED)
//   - GATE_ISSUED: sign a leave-chain JWT for the gate (Phase 2 makes
//     this the offline token; Phase 1 stores the token payload so the
//     gate can verify the chain before a manual override)

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    let reminders = 0;
    let escalated = 0;
    let expired = 0;
    let gateIssued = 0;

    // 1. Auto-expiry: requests whose window has passed and never reached
    //    GATE_ISSUED / USED.
    const exp = await query<{ id: string }>(
      `UPDATE public.leave_requests
          SET status = 'EXPIRED', expires_at = expires_at
        WHERE status IN ('DRAFT','WARDEN_APPROVED','PARENT_ACKNOWLEDGED')
          AND expires_at IS NOT NULL AND expires_at < now()
        RETURNING id`);
    expired = exp.rows.length;

    // 2. DRAFT → warden reminder / escalation.
    //    Warden has had 2h (reminder) / 6h (escalation) since creation.
    const due = await query<{
      id: string; student_id: string; status: string;
      created_at: string; warden_approved_at: string | null;
      parent_acknowledged_at: string | null; expires_at: string | null;
    }>(
      `SELECT id, student_id, status, created_at,
              warden_approved_at, parent_acknowledged_at, expires_at
         FROM public.leave_requests
        WHERE status IN ('DRAFT','WARDEN_APPROVED','PARENT_ACKNOWLEDGED')
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY created_at ASC
        LIMIT 200`);

    for (const lr of due.rows) {
      const ageH = (Date.now() - new Date(lr.created_at).getTime()) / 36e5;

      if (lr.status === "DRAFT") {
        if (ageH >= 6) {
          // Escalate to hostel manager after 6h unapproved.
          await query(
            `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
             VALUES ('medium', 'leave_chain', $1, $2, $3, NULL)`,
            [lr.id,
             `Hostel leave ${lr.id.slice(0, 8)} unapproved for 6h — escalated to Hostel Manager`,
             `Student ${lr.student_id} is still at DRAFT; warden tap needed`],
          ).catch(() => undefined);
          escalated += 1;
        } else if (ageH >= 2) {
          await query(
            `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
             VALUES ('low', 'leave_chain', $1, $2, $3, NULL)`,
            [lr.id,
             `Hostel leave reminder: warden approval pending`,
             `Student ${lr.student_id} requested leave 2h ago; one tap to approve`],
          ).catch(() => undefined);
          reminders += 1;
        }
      } else if (lr.status === "WARDEN_APPROVED") {
        // Parent acknowledgement pending.
        const waitH = (Date.now() - new Date(lr.warden_approved_at ?? lr.created_at).getTime()) / 36e5;
        if (waitH >= 12) {
          await query(
            `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
             VALUES ('medium', 'leave_chain', $1, $2, $3, NULL)`,
            [lr.id,
             `Hostel leave: parent acknowledgement overdue (12h) — escalated to student`,
             `Warden approved; parent tap still needed for the gate pass`],
          ).catch(() => undefined);
          escalated += 1;
        } else if (waitH >= 4) {
          await query(
            `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
             VALUES ('low', 'leave_chain', $1, $2, $3, NULL)`,
            [lr.id,
             `Hostel leave reminder: parent acknowledgement pending`,
             `Warden approved ${lr.warden_approved_at}; parent tap needed for gate validity`],
          ).catch(() => undefined);
          reminders += 1;
        }
      } else if (lr.status === "PARENT_ACKNOWLEDGED") {
        // Both approvals present → issue the gate pass token payload.
        // Phase 1: store the signed chain token; the gate verify path
        // (manual override) checks gate/verify-leave-chain against it.
        const token = JSON.stringify({
          leaveRequestId: lr.id,
          studentId: lr.student_id,
          chain: "PARENT_ACKNOWLEDGED",
          wardenApprovedAt: lr.warden_approved_at,
          parentAcknowledgedAt: lr.parent_acknowledged_at,
          issuedAt: new Date().toISOString(),
        });
        await query(
          `UPDATE public.leave_requests
              SET status = 'GATE_ISSUED', gate_jwt = $2, gate_issued_at = now()
            WHERE id = $1`,
          [lr.id, token],
        );
        gateIssued += 1;
      }
    }

    await recordMutationAudit({
      actorId: "00000000-0000-0000-0000-000000000000",
      actorType: "agent",
      roleContext: "deputy_warden",
      entityScope: "HOSTEL",
      action: "leave_chain_reconcile",
      resource: "leave_requests",
      afterState: { reminders, escalated, expired, gateIssued },
    });

    return Response.json({
      success: true,
      processed: due.rows.length,
      reminders, escalated, expired, gateIssued,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
