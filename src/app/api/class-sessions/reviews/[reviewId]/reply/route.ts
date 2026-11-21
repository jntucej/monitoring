// /api/class-sessions/reviews/[reviewId]/reply
//
// POST { reply } — a faculty replies to a specific class-session review
// (closes the loop on the student's feedback). Mirrors the mess-review reply
// pattern: withMutationGuard + CSRF + audit + notification. The review must
// belong to the calling faculty (or an authority acting on the review's
// faculty); a reply appends to the review's note with a "---" separator
// (no schema change).

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { replyToReview } from "@/lib/class-reviews";
import { query } from "@/lib/postgres";
import { addAudit, addNotification } from "@/lib/db";
import { isCleanComment } from "@/lib/profanity";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["faculty", "hod", "vp", "principal", "admin", "sysadmin"]);

function getReviewId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Only faculty or an authority can reply", 403);

  const reviewId = getReviewId(req);
  if (!reviewId) return fail("VALIDATION_ERROR", "reviewId missing", 400);

  const { reply } = (await req.json().catch(() => ({}))) as { reply?: string };
  if (!reply || !reply.trim()) return fail("VALIDATION_ERROR", "reply required", 400);
  const replyText = reply.trim().slice(0, 500);
  const profanity = isCleanComment(replyText);
  if (!profanity.clean) {
    return fail("COMMENT_FLAGGED", "Please keep your response constructive.", 422);
  }

  // The review's faculty is the acting id. A faculty caller may only reply to
  // their own sessions (replyToReview enforces faculty_id = actingId); an
  // authority acts on behalf of the review's faculty.
  let actingId: string;
  if (auth.role === "faculty") {
    actingId = auth.userId;
  } else {
    const { rows } = await query<{ faculty_id: string; student_id: string | null }>(
      `SELECT faculty_id::text AS faculty_id, student_id::text AS student_id
         FROM public.class_session_reviews WHERE id = $1 LIMIT 1`,
      [reviewId],
    );
    if (!rows[0]) return fail("NOT_FOUND", "Review not found", 404);
    actingId = rows[0].faculty_id;
  }

  const updated = await replyToReview(reviewId, actingId, replyText);
  if (!updated) {
    return fail(
      "NOT_ALLOWED",
      auth.role === "faculty"
        ? "This review does not belong to your sessions"
        : "Review not found",
      auth.role === "faculty" ? 403 : 404,
    );
  }

  // Notify the reviewing student (when not anonymous + a student is linked).
  if (auth.role === "faculty") {
    const { rows } = await query<{ student_id: string | null; is_anonymous: boolean }>(
      `SELECT student_id::text AS student_id, is_anonymous FROM public.class_session_reviews WHERE id = $1 LIMIT 1`,
      [reviewId],
    );
    const target = rows[0];
    if (target && !target.is_anonymous && target.student_id) {
      await addNotification(
        "user",
        target.student_id,
        "class_review_reply",
        "A faculty replied to your class review",
        replyText.slice(0, 200),
      );
    }
  }

  await addAudit({
    action: "CLASS_REVIEW_REPLIED",
    userId: auth.userId,
    role: auth.role,
    details: { reviewId, actingFacultyId: actingId },
  });

  return ok({ reviewId, replied: true });
}

export const POST = withMutationGuard(handlePost);
