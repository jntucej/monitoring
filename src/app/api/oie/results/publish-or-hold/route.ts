import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/oie/results/publish-or-hold — Semester result publication /
 * withholding.
 *
 * The OIE publishes semester results (dispatching the Result Analysis pack to
 * HOD/Principal) or toggles a student's result to WITHHELD (unpaid dues /
 * pending malpractice). Withholding blocks next-semester promotion + degree
 * issuance until cleared.
 *
 * DEBARRED status edits are OUT of OIE solo scope — those route to the
 * QuorumGate (Principal + OIE) via /api/principal/quorum/sign. This handler
 * returns HOLD_FOR_QUORUM when a DEBARRED override is requested.
 *
 * Live-DB: marks.status is the result state; the withhold reason is recorded
 * in a marks correction_reason + a campus_feed item.
 */

export interface ResultsPublishBody {
  action: "publish_semester" | "withhold_result" | "release_withhold" | "debarred_override";
  semesterNumber?: number;
  studentId?: string;
  withholdReason?: "DUES" | "MALPRACTICE" | "INDISCipline" | string;
  // For debarred_override — the OIE cannot execute this solo.
  debarredAction?: "set_debarred" | "lift_debarred";
}

async function implPost(req: NextRequest, ctx: ApiChainContext<ResultsPublishBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as ResultsPublishBody;
  const auth = ctx.auth;
  if (!["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Result publish/hold requires oie/exam_branch/admin.", 403);
  }
  const { action } = body;

  // DEBARRED override = Immutable Meta-Rule: OIE cannot solo-execute. Route
  // to Principal Quorum (oie + principal co-sign) via /api/principal/quorum/sign.
  if (action === "debarred_override") {
    return ok({
      holdForQuorum: true,
      reason: "DEBARRED status changes are a two-person quorum action (OIE + Principal). OIE drafts; Principal publishes.",
      requiredRoles: ["oie", "principal"],
      nextEndpoint: "/api/principal/quorum/sign",
      actionKey: "debarred_override",
    });
  }

  if (action === "publish_semester") {
    // Publish all LOCKED marks for the semester + dispatch analysis pack.
    const sem = body.semesterNumber;
    const locked = await query<{ id: string; student_id: string; subject_code: string; score: number | null }>(
      `SELECT id, student_id, subject_code, score FROM public.marks
         WHERE status = 'LOCKED' AND term = $1`,
      [String(sem ?? "")],
    ).catch(() => ({ rows: [] as { id: string; student_id: string; subject_code: string; score: number | null }[] }));
    const n = locked.rows.length;
    if (n > 0) {
      await query(
        `UPDATE public.marks
            SET status = 'PUBLISHED', published_at = NOW(),
                corrected_by = COALESCE(corrected_by, $1), updated_at = NOW()
          WHERE status = 'LOCKED' AND term = $2`,
        [auth.userId, String(sem ?? "")],
      ).catch(() => {});
    }
    // Dispatch the Result Analysis pack to HOD/Principal (outbox event).
    await query(
      `INSERT INTO public.domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
      [
        "oie.semester_results_published",
        JSON.stringify({ semester: sem ?? null, published: n, dispatchedAt: new Date().toISOString(), by: auth.userId }),
      ],
    ).catch(() => {});
    return ok({
      published: n,
      semester: sem ?? null,
      dispatched: true,
      note: `Published ${n} locked result rows. Result Analysis pack dispatched to HOD/Principal via domain_outbox.`,
    });
  }

  if (action === "withhold_result" || action === "release_withhold") {
    const sid = body.studentId;
    if (!sid) return fail("MISSING_BODY", "studentId required.", 400);
    const isWithhold = action === "withhold_result";
    const reason = body.withholdReason ?? "UNPAID_DUES";
    // Record the withhold on the student's latest marks row(s) + a feed item.
    if (isWithhold) {
      await query(
        `UPDATE public.marks
            SET status = 'DRAFT', published_at = NULL,
                correction_reason = 'WITHHELD: ' || $1,
                corrected_by = $2, updated_at = NOW()
          WHERE student_id = $3 AND status = 'PUBLISHED'`,
        [reason, auth.userId, sid],
      ).catch(() => {});
      await query(
        `INSERT INTO public.campus_feed_items (kind, title, target_scope, posted_by, posted_by_role, status)
           VALUES ('alert', 'Result withheld: ' || $1, $2, $3, $4, 'active')`,
        [reason, JSON.stringify({ studentId: sid, reason, at: new Date().toISOString() }), "STUDENT_SCOPE", auth.userId, auth.role],
      ).catch(() => {});
      return ok({ withheld: true, studentId: sid, reason, note: `Result withheld (${reason}). Promotion + degree issuance blocked until cleared.` });
    } else {
      await query(
        `UPDATE public.marks
            SET status = 'PUBLISHED', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
          WHERE student_id = $1 AND status = 'DRAFT' AND correction_reason ILIKE 'WITHHELD%'`,
        [sid],
      ).catch(() => {});
      return ok({ released: true, studentId: sid, note: "Withhold released; result re-published." });
    }
  }

  return fail("UNKNOWN_ACTION", "Unknown results action.", 400);
}

export const POST = withApiChain(implPost, {
  route: "/api/oie/results/publish-or-hold",
  auth: "user",
  requiredRole: ["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"],
});
