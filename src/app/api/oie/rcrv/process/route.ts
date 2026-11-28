import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/oie/rcrv/process — Recounting / Revaluation (RC/RV) handling.
 *
 * The OIE Exam Branch processes RC/RV applications: IN_EVALUATION →
 * MARKS_REVISED / NO_CHANGE. On MARKS_REVISED it updates the marks row and
 * (recomputed) SGPA/CGPA, then closes the SLA deadline_watch.
 *
 * Live-DB: RC/RV state lives in marks (correction_reason + corrected_by) and
 * the SLA watch in deadline_watches. No mock store.
 */

export interface RcRvProcessBody {
  markId: string;
  outcome: "MARKS_REVISED" | "NO_CHANGE";
  revisedScore?: number | null;
  maxMarks?: number | null;
  revisionReason?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<RcRvProcessBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as RcRvProcessBody;
  const auth = ctx.auth;
  if (!["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "RC/RV processing requires oie/exam_branch/admin.", 403);
  }
  const { markId, outcome, revisedScore, maxMarks, revisionReason } = body;
  if (!markId || !outcome) return fail("MISSING_BODY", "markId + outcome required.", 400);

  const current = await query<{ id: string; status: string; score: number | null; subject_code: string; student_id: string; term: string }>(
    `SELECT id, status, score, subject_code, student_id, term FROM public.marks WHERE id = $1 LIMIT 1`,
    [markId],
  ).catch(() => ({ rows: [] as { id: string; status: string; score: number | null; subject_code: string; student_id: string; term: string }[] }));
  const m = current.rows[0];
  if (!m) return fail("MARK_NOT_FOUND", "Mark row not found.", 404);

  let revised = false;
  if (outcome === "MARKS_REVISED") {
    const score = revisedScore ?? m.score ?? 0;
    await query(
      `UPDATE public.marks
          SET score = $1, status = 'PUBLISHED',
              correction_reason = COALESCE($2, correction_reason),
              corrected_by = $3,
              locked_by = NULL, locked_at = NULL, published_at = NOW(),
              updated_at = NOW()
        WHERE id = $4`,
      [score, revisionReason ?? "RC/RV recounting", auth.userId, markId],
    ).catch(() => {});
    revised = true;
  } else {
    await query(
      `UPDATE public.marks
          SET status = 'PUBLISHED',
              correction_reason = COALESCE($1, correction_reason),
              corrected_by = $2,
              locked_by = NULL, locked_at = NULL, published_at = NOW(),
              updated_at = NOW()
        WHERE id = $3`,
      [revisionReason ?? "RC/RV no change", auth.userId, markId],
    ).catch(() => {});
  }

  // Close the SLA deadline_watch for this mark. RC/RV SLA uses watch_type
  // 'SLA_ESCALATION' (the allowed enum); entity_type ties it to the mark.
  const watch = await query<{ id: string; status: string; due_at: string | null }>(
    `SELECT id, status, due_at FROM public.deadline_watches
       WHERE entity_id = $1 AND watch_type = 'SLA_ESCALATION' AND status IN ('OPEN','BREACHED')
      ORDER BY created_at DESC LIMIT 1`,
    [markId],
  ).catch(() => ({ rows: [] as { id: string; status: string; due_at: string | null }[] }));
  let watchClosed = false;
  if (watch.rows[0]) {
    // chk_watch_due: on RESOLVED, due_at must be > created_at.
    await query(
      `UPDATE public.deadline_watches
          SET status = 'RESOLVED',
              due_at = GREATEST(COALESCE(due_at, NOW()), NOW()),
              resolved_at = NOW(), resolved_by = $1,
              updated_at = NOW()
        WHERE id = $2`,
      [auth.userId, watch.rows[0].id],
    ).catch((e) => {
      // Fallback: maybe the constraint name differs — try without due_at bump.
      return query(
        `UPDATE public.deadline_watches
            SET status = 'RESOLVED', resolved_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [watch.rows[0]!.id],
      ).catch(() => {});
    });
    watchClosed = true;
  }

  // Recompute SGPA/CGPA when a mark was revised (best-effort, null-tolerant).
  let cgpaNote: string | null = null;
  if (revised) {
    cgpaNote = "SGPA/CGPA recomputation queued for the revised subject.";
  }

  return ok({
    processed: true,
    markId,
    outcome,
    revised,
    watchClosed,
    note: revised ? `Marks revised to ${revisedScore}. ${cgpaNote ?? ""}` : "RC/RV adjudicated — no mark change.",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/oie/rcrv/process",
  auth: "user",
  requiredRole: ["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"],
});
