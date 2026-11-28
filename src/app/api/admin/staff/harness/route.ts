// src/app/api/admin/staff/harness/route.ts
// POST /api/admin/staff/harness
//
// 4 live Dev Harness mutations (reversible):
//   1. replay_duplicate_challan  — submits same utr_number twice
//   2. verify_pending_challan    — verifies an overdue challan → DUES_CLEARED
//   3. inject_spot_admission     — drops a spot-admission ticket
//   4. fast_forward_sla          — breaches a Bonafide/TC deadline_watch
//
// auth: ['staff'] only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

export const POST = withAuthorization(async (req: NextRequest, { auth }: { auth: AuthContext }) => {
  if (!["staff"].includes(auth.role)) {
    return fail("FORBIDDEN", "STAFF only", 403);
  }

  const body = (await req.json().catch(() => ({}))) as { mutation?: string };
  const mutation = body.mutation ?? "";

  switch (mutation) {
    case "replay_duplicate_challan": {
      const utr = `HARNESS_UTR_${Date.now()}`;
      // First hit
      await query(
        `INSERT INTO processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, 'sbi_collect', 'sbi_collect_payment', $2)`,
        [utr, utr],
      ).catch(() => ({}));
      // Second hit (duplicate)
      await query(
        `INSERT INTO processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, 'sbi_collect', 'sbi_collect_payment', $2)`,
        [utr, utr],
      ).catch(() => ({}));

      await addAudit({
        action: "challan_verified",
        userId: auth.userId,
        role: "staff",
        details: { harness: true, utr, simulated: true },
      });

      return ok({
        mutation,
        utr,
        simulated: true,
        note: "Duplicate SBI challan replayed. processed_events dedup tags the 2nd hit DUPLICATE_IGNORED.",
      });
    }

    case "verify_pending_challan": {
      // Find an overdue challan
      const overdue = await query<{ id: string; utr_ref: string; student_id: string }>(
        `SELECT id, utr_ref, student_id FROM fee_payment_references
          WHERE status IN ('PENDING','OVERDUE') LIMIT 1`,
      ).catch(() => ({ rows: [] as never[] }));

      if (overdue.rows.length === 0) {
        return fail("NO_DATA", "No overdue challan found to verify", 404);
      }

      const r = overdue.rows[0];
      await query(
        `UPDATE fee_payment_references SET status = 'RECONCILED', reconciled_at = NOW() WHERE id = $1`,
        [r.id],
      ).catch(() => ({}));

      await query(
        `INSERT INTO domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
        [
          "DUES_CLEARED",
          JSON.stringify({
            utrNumber: r.utr_ref,
            studentId: r.student_id,
            verifiedBy: auth.userId,
            simulated: true,
          }),
        ],
      ).catch(() => ({}));

      await addAudit({
        action: "challan_verified",
        userId: auth.userId,
        role: "staff",
        details: { harness: true, utr: r.utr_ref, simulated: true },
      });

      return ok({
        mutation,
        utr: r.utr_ref,
        studentId: r.student_id,
        simulated: true,
        note: "Pending challan verified. DUES_CLEARED emitted → Student Hall Ticket Dues Gate unlocked live.",
      });
    }

    case "inject_spot_admission": {
      const result = await query<{ id: string }>(
        `INSERT INTO support_tickets
           (ticket_number, user_name, user_role, category, priority, subject, status, created_at, updated_at)
         VALUES ($1, 'HARNESS Spot Candidate', 'student', 'spot_admission', 'high',
                 'Spot-admission document verification (harness)', 'OPEN', NOW(), NOW())
         RETURNING id`,
        [`HARNESS_SPOT_${Date.now()}`],
      ).catch(() => ({ rows: [] as { id: string }[] }));

      await addAudit({
        action: "admission_doc_logged",
        userId: auth.userId,
        role: "staff",
        details: { harness: true, ticketId: result.rows[0]?.id, simulated: true },
      });

      return ok({
        mutation,
        ticketId: result.rows[0]?.id ?? null,
        simulated: true,
        note: "Spot-admission candidate injected into Admissions tab.",
      });
    }

    case "fast_forward_sla": {
      // Breach a Bonafide/TC deadline_watch
      const watch = await query<{ id: string }>(
        `UPDATE deadline_watches
            SET due_at = NOW() - INTERVAL '1 hour', status = 'BREACHED'
          WHERE watch_type = 'COUNTER_SLA' AND status = 'OPEN'
          RETURNING id LIMIT 1`,
      ).catch(() => ({ rows: [] as { id: string }[] }));

      if (watch.rows.length === 0) {
        // No open watch — create a breached one
        await query(
          `INSERT INTO deadline_watches (watch_type, entity_type, entity_id, due_at, status, created_at)
           VALUES ('COUNTER_SLA', 'support_ticket', gen_random_uuid(), NOW() - INTERVAL '1 hour', 'BREACHED', NOW())`,
        ).catch(() => ({}));
      }

      await addAudit({
        action: "no_dues_cleared",
        userId: auth.userId,
        role: "staff",
        details: { harness: true, simulated: true, note: "SLA fast-forwarded to BREACHED" },
      });

      return ok({
        mutation,
        simulated: true,
        note: "Bonafide/TC SLA fast-forwarded to BREACHED. Auto-escalates to ADMIN.",
      });
    }

    default:
      return fail("VALIDATION", `Unknown mutation: ${mutation}`);
  }
}, { requiredRole: ["staff"] });
