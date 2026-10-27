// src/app/api/cron/complaint-sla-sweep/route.ts
// POST — SLA sweep cron: checks open complaints against their SLA deadline,
// sends warnings at 75%, and auto-escalates at 100%.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { query, addNotification, addAudit } from "@/lib/db";
import { getChain } from "@/lib/complaint-taxonomy";

function checkAuth(req: NextRequest): boolean {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { rows: openComplaints } = await query<any>(
    `SELECT id, complaint_number, category_code, current_owner_role,
            created_at, sla_deadline, status, raised_by
       FROM public.complaints
      WHERE status IN ('submitted','acknowledged','assigned','in_progress')
        AND sla_deadline IS NOT NULL
        AND deleted_at IS NULL`,
  );

  let escalated = 0;
  let warned = 0;
  let principalPinged = 0;
  const now = Date.now();

  for (const c of openComplaints) {
    const created = new Date(c.created_at).getTime();
    const deadline = new Date(c.sla_deadline).getTime();
    const totalDuration = Math.max(1, deadline - created);
    const elapsed = Math.max(0, now - created);
    const pct = (elapsed / totalDuration) * 100;

    const chain = await getChain(c.category_code);
    const currentIndex = chain.findIndex((s) => s.role === c.current_owner_role);
    const nextStep = chain[currentIndex + 1];

    if (pct >= 100) {
      // SLA Breached / Auto-escalate
      if (nextStep) {
        const newSla = new Date(Date.now() + nextStep.slaHours * 3_600_000).toISOString();
        await query(
          `UPDATE public.complaints
              SET current_owner_role = $2,
                  sla_deadline = $3,
                  escalation_level = escalation_level + 1,
                  updated_at = NOW()
            WHERE id = $1`,
          [c.id, nextStep.role, newSla],
        );
        await query(
          `INSERT INTO public.complaint_tasks (complaint_id, owner_role, action, status, due_at)
           VALUES ($1, $2, 'Auto-escalated due to SLA breach', 'pending', $3)`,
          [c.id, nextStep.role, newSla],
        );
        await addNotification(
          "role",
          nextStep.role,
          "complaint_auto_escalated",
          `Auto-Escalated: ${c.complaint_number}`,
          `Complaint ${c.complaint_number} breached SLA at previous tier and was escalated to you.`,
        );
        await addAudit({
          action: "COMPLAINT_AUTO_ESCALATED",
          userId: "system",
          details: { complaintId: c.id, fromRole: c.current_owner_role, toRole: nextStep.role },
        });
        escalated++;
      } else {
        // At principal already — notify principal repeatedly
        await addNotification(
          "role",
          "principal",
          "complaint_sla_breached",
          `SLA Breached (Principal): ${c.complaint_number}`,
          `Complaint ${c.complaint_number} is past its final SLA deadline at the Principal tier.`,
        );
        principalPinged++;
      }
    } else if (pct >= 75) {
      // 75% warning (check if audit already logged warning for this threshold)
      const { rows: warnedYet } = await query(
        `SELECT 1 FROM public.audit_logs WHERE action = 'COMPLAINT_SLA_WARNING' AND details->>'complaintId' = $1 LIMIT 1`,
        [c.id],
      );
      if (!warnedYet[0]) {
        await addNotification(
          "role",
          c.current_owner_role,
          "complaint_sla_warning",
          `SLA Warning: ${c.complaint_number}`,
          `Complaint ${c.complaint_number} has consumed 75% of its SLA time.`,
        );
        await addAudit({
          action: "COMPLAINT_SLA_WARNING",
          userId: "system",
          details: { complaintId: c.id, role: c.current_owner_role, pct: Math.round(pct) },
        });
        warned++;
      }
    }
  }

  return NextResponse.json({
    checked: openComplaints.length,
    escalated,
    warned,
    principalPinged,
  });
}
