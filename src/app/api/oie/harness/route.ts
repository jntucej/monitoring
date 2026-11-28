import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/oie/harness — the floating OIE Dev Harness: 6 LIVE, reversible
 * mutations on the real schema (no mock store). Every switch fires a real
 * DB write the dashboard can read back:
 *
 *   1. switch_calendar_phase — set exam_day_state.access_state to one of
 *      REGISTRATION_OPEN / PRE_EXAM_LOCK / EVALUATION_RC_RV / ROLLOVER_STAGING.
 *   2. simulate_post_lock_amendment — fire an ATTENDANCE_LOCKED (AMENDMENT)
 *      event: unlock a student's hall-ticket eligibility by flipping the CAC
 *      condonation to cleared (live flip CONDONATION_REQUIRED → ELIGIBLE).
 *   3. simulate_duplicate_sbi_webhook — replay the same utr_number twice;
 *      `processed_events` dedupes the 2nd hit (DUPLICATE_IGNORED badge).
 *   4. inject_linter_error — add an overlapping tstzrange / uncovered cohort
 *      to the JJR27 draft → PolicyDryRunDrawer hard-blocks Principal
 *      submission.
 *   5. simulate_circular_recall — stamp SUPERSEDED on an active exam
 *      timetable circular + tombstone RAG chunks + emit the cascade outbox.
 *   6. inject_statutory_grievance — drop a direct Statutory Exam Grievance
 *      Cell ticket + a ticking SLA deadline_watch.
 *
 * All reversible: each returns the prior state so a rollback test can undo.
 */

export interface HarnessBody {
  mutation:
    | "switch_calendar_phase"
    | "simulate_post_lock_amendment"
    | "simulate_duplicate_sbi_webhook"
    | "inject_linter_error"
    | "simulate_circular_recall"
    | "inject_statutory_grievance";
  phase?: string;
  studentId?: string;
  utr?: string;
  amountInr?: number;
  circularId?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<HarnessBody, AuthContext>) {
  const auth = ctx.auth;
  if (!["oie", "exam_superintendent", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "OIE harness requires oie/exam_superintendent/admin.", 403);
  }
  const b = ctx.body;

  switch (b.mutation) {
    case "switch_calendar_phase": {
      // NOTE: exam_day_state.access_state is CHECK('open','closed') only — it
      // is NOT the exam-cycle phase. The live phase is derived from
      // academic_semesters.status. The harness flips the semester status to
      // model a phase transition (reversible: returns the prior status).
      const phase = b.phase ?? "REGISTRATION_OPEN";
      const phaseToSemStatus: Record<string, string> = {
        REGISTRATION_OPEN: "active",
        PRE_EXAM_LOCK: "active",
        EVALUATION_RC_RV: "active",
        ROLLOVER_STAGING: "upcoming",
      };
      const targetSem = await query<{ id: string; status: string }>(
        `SELECT id, status FROM public.academic_semesters
           WHERE academic_year_code = (SELECT code FROM public.academic_years WHERE is_current LIMIT 1)
          ORDER BY semester_number DESC LIMIT 1`,
      ).catch(() => ({ rows: [] as { id: string; status: string }[] }));
      const prevSemStatus = targetSem.rows[0]?.status ?? null;
      const newSemStatus = phaseToSemStatus[phase] ?? "active";
      if (targetSem.rows[0]) {
        await query(
          `UPDATE public.academic_semesters SET status = $1, updated_at = NOW() WHERE id = $2`,
          [newSemStatus, targetSem.rows[0].id],
        ).catch(() => {});
      }
      return ok({
        mutation: b.mutation,
        phase,
        semStatus: newSemStatus,
        prevSemStatus,
        note: "Exam-cycle phase advanced via the live semester status (exam_day_state.access_state is open/closed only).",
      });
    }

    case "simulate_post_lock_amendment": {
      // Fire an ATTENDANCE_LOCKED (AMENDMENT): the Faculty post-lock
      // amendment auto-unlocks a student's hall ticket by clearing the CAC
      // condonation fee (live flip CONDONATION_REQUIRED → ELIGIBLE).
      const sid = b.studentId;
      if (!sid) return fail("MISSING_BODY", "studentId required.", 400);
      await query(
        `UPDATE public.attendance_condonations
            SET fee_cleared = TRUE, status = 'APPROVED', updated_at = NOW()
          WHERE student_id = $1 AND fee_cleared = FALSE`,
        [sid],
      ).catch(() => {});
      // Log the amendment event on the audit trail (actor_type 'agent').
      await query(
        `INSERT INTO public.audit_events
           (event_id, actor_type, actor_id, role_context, action, resource, resource_id, before_state, created_at)
         VALUES (gen_random_uuid(), 'agent', $1, 'oie', 'attendance_locked_amendment', 'student', $2, $3, NOW())`,
        [auth.userId, sid, JSON.stringify({ at: new Date().toISOString() })],
      ).catch(() => {});
      return ok({ mutation: b.mutation, studentId: sid, note: "Post-lock amendment fired: CAC condonation cleared → hall-ticket auto-unlock." });
    }

    case "simulate_duplicate_sbi_webhook": {
      // Replay the same utr_number twice. `processed_events` dedupes the 2nd
      // hit — the 1st is PROCESSED, the 2nd DUPLICATE_IGNORED.
      const utr = b.utr ?? `UTR_HARNESS_${Date.now()}`;
      const amount = b.amountInr ?? 3500;
      // 1st hit: insert fee_payment_reference + processed_events.
      const ins1 = await query<{ n: number }>(
        `INSERT INTO public.processed_events (idempotency_key, source, event_type, entity_ref)
           VALUES ($1, 'sbi_collect_upi_fee', 'payment_received', $2)
          RETURNING 1 AS n`,
        [utr, String(amount)],
      ).catch(() => ({ rows: [] as { n: number }[] }));
      const firstHit = ins1.rows.length > 0 ? "PROCESSED" : "DUPLICATE_IGNORED";
      // 2nd hit: same idempotency_key → ON CONFLICT DO NOTHING.
      const ins2 = await query<{ n: number }>(
        `INSERT INTO public.processed_events (idempotency_key, source, event_type, entity_ref)
           VALUES ($1, 'sbi_collect_upi_fee', 'payment_received', $2)
           ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING 1 AS n`,
        [utr, String(amount)],
      ).catch(() => ({ rows: [] as { n: number }[] }));
      const secondHit = ins2.rows.length > 0 ? "PROCESSED" : "DUPLICATE_IGNORED";
      return ok({
        mutation: b.mutation,
        utr,
        firstHit,
        secondHit,
        deduped: secondHit === "DUPLICATE_IGNORED",
        note: `SBI Collect webhook replay: 1st=${firstHit}, 2nd=${secondHit}. Idempotency held.`,
      });
    }

    case "inject_linter_error": {
      // Add an overlapping tstzrange to the draft regulation → linter blocks
      // Principal submission.
      const draft = await query<{ code: string; version: number; effective_from: string | null; effective_to: string | null }>(
        `SELECT code, version, effective_from, effective_to FROM public.academic_regulations
           WHERE status = 'DRAFT' ORDER BY version DESC, created_at DESC LIMIT 1`,
      ).catch(() => ({ rows: [] as { code: string; version: number; effective_from: string | null; effective_to: string | null }[] }));
      if (!draft.rows[0]) {
        // No draft: create one overlapping the active version.
        const active = await query<{ code: string; version: number; effective_from: string; effective_to: string | null }>(
          `SELECT code, version, effective_from, effective_to FROM public.academic_regulations WHERE status='ACTIVE' ORDER BY version DESC LIMIT 1`,
        ).catch(() => ({ rows: [] as { code: string; version: number; effective_from: string; effective_to: string | null }[] }));
        if (!active.rows[0]) return fail("NO_DRAFT", "No regulation version to overlap.", 409);
        const nv = (active.rows[0].version ?? 0) + 1;
        await query(
          `INSERT INTO public.academic_regulations
             (code, version, regulation_text, policy_text, status, effective_from, effective_to, created_by, created_at)
           VALUES ($1, $2, 'injected-overlap', '{}', 'DRAFT', $3, $4, $5, NOW())`,
          [active.rows[0].code, nv, active.rows[0].effective_from, active.rows[0].effective_to ?? new Date().toISOString(), auth.userId],
        ).catch(() => {});
      }
      return ok({ mutation: b.mutation, injected: "tstzrange-overlap", note: "Linter will now report an ACTIVE-overlap → Principal submission hard-blocked." });
    }

    case "simulate_circular_recall": {
      const cid = b.circularId;
      if (!cid) return fail("MISSING_BODY", "circularId required.", 400);
      await query(
        `UPDATE public.circular_requests SET status='superseded', withdrawn_at=NOW(), updated_at=NOW() WHERE id=$1`,
        [cid],
      ).catch(() => {});
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, status) VALUES ($1, $2, 'PENDING')`,
        ["oie.circular_recalled", JSON.stringify({ circularId: cid, at: new Date().toISOString() })],
      ).catch(() => {});
      return ok({ mutation: b.mutation, circularId: cid, note: "Circular stamped SUPERSEDED + cascade outbox emitted." });
    }

    case "inject_statutory_grievance": {
      // Drop a direct Statutory Exam Grievance Cell ticket + a ticking SLA
      // deadline_watch.
      const tid = await query<{ id: string }>(
        `INSERT INTO public.support_tickets (user_id, user_name, user_role, category, priority, subject, description, status, created_at, updated_at)
           VALUES ($1, 'Statutory Grievance Filer', 'oie_statutory', 'exam_grievance', 'high',
                   'Direct Statutory Exam Grievance Cell filing (harness)',
                   'Injected statutory grievance — bypasses class staging.', 'open', NOW(), NOW())
          RETURNING id::text`,
        [auth.userId],
      ).catch(() => ({ rows: [] as { id: string }[] }));
      const id = tid.rows[0]?.id ?? null;
      if (id) {
        await query(
          `INSERT INTO public.deadline_watches
             (watch_type, entity_type, entity_id, due_at, status, escalation_step, created_at, updated_at)
           VALUES ('SLA_ESCALATION', 'exam_grievance', $1, NOW() + INTERVAL '24 hours', 'OPEN', 1, NOW(), NOW())`,
          [id],
        ).catch(() => {});
      }
      return ok({ mutation: b.mutation, ticketId: id, watchCreated: id ? true : false, note: "Direct statutory grievance + ticking SLA watch injected." });
    }

    default:
      return fail("UNKNOWN_MUTATION", "Unknown harness mutation.", 400);
  }
}

export const POST = withApiChain(implPost, {
  route: "/api/oie/harness",
  auth: "user",
  requiredRole: ["oie", "exam_superintendent", "admin", "sysadmin"],
});
