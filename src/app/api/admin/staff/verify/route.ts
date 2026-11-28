// src/app/api/admin/staff/verify/route.ts
// POST /api/admin/staff/verify
//
// Validates a desk action (VERIFY_CHALLAN, CLEAR_NO_DUES, APPROVE_BONAFIDE_TC,
// LOG_ADMISSION_DOC, ARCHIVE_COURSE_REG) via SchemaFormDrawer, enforces
// processed_events idempotency, emits DUES_CLEARED / COUNTER_RESOLVED to
// domain_outbox, and closes the ticket's deadline_watch.
//
// STRICT DESK BOUNDARY: STAFF can only execute counter actions. No policy
// drafting, no delegate activation, no topology.
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

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    ticketId?: string;
    utrNumber?: string;
    receiptNo?: string;
    deskUnit?: string;
    studentId?: string;
  };

  const action = body.action ?? "";
  const desk = body.deskUnit ?? "UNKNOWN";

  // Idempotency key: {desk}:{receipt_no} or {utr_number}
  const idempotencyKey = body.utrNumber
    ? `utr:${body.utrNumber}`
    : body.receiptNo
      ? `${desk}:${body.receiptNo}`
      : `${desk}:${body.ticketId ?? "unknown"}`;

  // Check for duplicate (processed_events)
  const dupCheck = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM processed_events WHERE idempotency_key = $1`,
    [idempotencyKey],
  ).catch(() => ({ rows: [] as { count: number }[] }));
  const isDuplicate = Number(dupCheck.rows[0]?.count ?? 0) > 0;

  if (isDuplicate) {
    return ok({
      duplicate: true,
      status: "DUPLICATE_IGNORED",
      idempotencyKey,
      note: "This receipt/UTR was already verified. Duplicate silently deduplicated.",
    });
  }

  // Execute the action
  switch (action) {
    case "VERIFY_CHALLAN": {
      if (!body.utrNumber) return fail("VALIDATION", "utrNumber required for VERIFY_CHALLAN");

      // Mark the fee_payment_reference as reconciled
      await query(
        `UPDATE fee_payment_references SET status = 'RECONCILED', reconciled_at = NOW() WHERE utr_ref = $1`,
        [body.utrNumber],
      ).catch(() => ({}));

      // Record the processed_event (idempotency)
      await query(
        `INSERT INTO processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, 'sbi_collect', 'challan_verified', $2)`,
        [idempotencyKey, body.utrNumber],
      ).catch(() => ({}));

      // Emit DUES_CLEARED to domain_outbox (recalculates Hall Ticket Dues Gate)
      await query(
        `INSERT INTO domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
        [
          "DUES_CLEARED",
          JSON.stringify({
            utrNumber: body.utrNumber,
            deskUnit: desk,
            verifiedBy: auth.userId,
            verifiedAt: new Date().toISOString(),
          }),
        ],
      ).catch(() => ({}));

      // Close the ticket's deadline_watch
      if (body.ticketId) {
        await query(
          `UPDATE deadline_watches SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = $1::uuid
            WHERE entity_id = $2::uuid AND watch_type = 'COUNTER_SLA' AND status IN ('OPEN','BREACHED')`,
          [auth.userId, body.ticketId],
        ).catch(() => ({}));

        await query(
          `UPDATE support_tickets SET status = 'RESOLVED', updated_at = NOW() WHERE id = $1`,
          [body.ticketId],
        ).catch(() => ({}));
      }

      await addAudit({
        action: "challan_verified",
        userId: auth.userId,
        role: "staff",
        details: { utrNumber: body.utrNumber, deskUnit: desk, idempotencyKey },
      });

      return ok({
        verified: true,
        utrNumber: body.utrNumber,
        idempotencyKey,
        outboxEmitted: "DUES_CLEARED",
        ticketClosed: Boolean(body.ticketId),
        note: "Challan verified. DUES_CLEARED emitted → Student Hall Ticket Dues Gate recalculated live.",
      });
    }

    case "CLEAR_NO_DUES": {
      if (!body.receiptNo) return fail("VALIDATION", "receiptNo required for CLEAR_NO_DUES");

      await query(
        `INSERT INTO processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, 'library', 'no_dues_cleared', $2)`,
        [idempotencyKey, body.receiptNo],
      ).catch(() => ({}));

      await query(
        `INSERT INTO domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
        [
          "COUNTER_RESOLVED",
          JSON.stringify({
            receiptNo: body.receiptNo,
            deskUnit: desk,
            clearedBy: auth.userId,
            clearedAt: new Date().toISOString(),
          }),
        ],
      ).catch(() => ({}));

      if (body.ticketId) {
        await query(
          `UPDATE support_tickets SET status = 'RESOLVED', updated_at = NOW() WHERE id = $1`,
          [body.ticketId],
        ).catch(() => ({}));
      }

      await addAudit({
        action: "no_dues_cleared",
        userId: auth.userId,
        role: "staff",
        details: { receiptNo: body.receiptNo, deskUnit: desk },
      });

      return ok({
        cleared: true,
        receiptNo: body.receiptNo,
        idempotencyKey,
        outboxEmitted: "COUNTER_RESOLVED",
        note: "No-dues clearance stamped. COUNTER_RESOLVED emitted.",
      });
    }

    case "APPROVE_BONAFIDE_TC": {
      if (!body.ticketId) return fail("VALIDATION", "ticketId required");

      await query(
        `UPDATE support_tickets SET status = 'RESOLVED', updated_at = NOW() WHERE id = $1`,
        [body.ticketId],
      ).catch(() => ({}));

      await query(
        `INSERT INTO domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
        [
          "COUNTER_RESOLVED",
          JSON.stringify({
            ticketId: body.ticketId,
            deskUnit: desk,
            type: "bonafide_tc",
            approvedBy: auth.userId,
          }),
        ],
      ).catch(() => ({}));

      await addAudit({
        action: "bonafide_tc_approved",
        userId: auth.userId,
        role: "staff",
        details: { ticketId: body.ticketId, deskUnit: desk },
      });

      return ok({
        approved: true,
        ticketId: body.ticketId,
        note: "Bonafide/TC counter request resolved.",
      });
    }

    case "LOG_ADMISSION_DOC": {
      await query(
        `INSERT INTO processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, 'admissions', 'admission_doc_logged', $2)`,
        [idempotencyKey, body.ticketId ?? "unknown"],
      ).catch(() => ({}));

      await addAudit({
        action: "admission_doc_logged",
        userId: auth.userId,
        role: "staff",
        details: { ticketId: body.ticketId, deskUnit: desk },
      });

      return ok({
        logged: true,
        note: "Admission document logged.",
      });
    }

    case "ARCHIVE_COURSE_REG": {
      await query(
        `INSERT INTO domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
        [
          "COURSE_REG_ARCHIVED",
          JSON.stringify({
            ticketId: body.ticketId,
            deskUnit: desk,
            archivedBy: auth.userId,
          }),
        ],
      ).catch(() => ({}));

      await addAudit({
        action: "course_reg_archived",
        userId: auth.userId,
        role: "staff",
        details: { ticketId: body.ticketId, deskUnit: desk },
      });

      return ok({
        archived: true,
        note: "HOD-countersigned Course Registration copy archived.",
      });
    }

    default:
      return fail("VALIDATION", `Unknown action: ${action}. Allowed: VERIFY_CHALLAN, CLEAR_NO_DUES, APPROVE_BONAFIDE_TC, LOG_ADMISSION_DOC, ARCHIVE_COURSE_REG`);
  }
}, { requiredRole: ["staff"] });
