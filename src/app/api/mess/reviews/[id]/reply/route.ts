// src/app/api/mess/reviews/[id]/reply/route.ts
// POST — mess-incharge/warden/admin/sysadmin replies to a review (R6).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit, addNotification } from "@/lib/db";
import { isCleanComment } from "@/lib/profanity";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "hostel_manager", "admin", "sysadmin"]);

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const id = getId(req);
  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  if (!body || !body.trim()) return fail("VALIDATION_ERROR", "body required", 400);
  const profanity = isCleanComment(body);
  if (!profanity.clean) {
    return fail("COMMENT_FLAGGED", "Please keep your response constructive.", 422);
  }

  const { rows: rev } = await query<{ user_id: string }>(
    `SELECT user_id FROM public.mess_meal_reviews WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id],
  );
  if (!rev[0]) return fail("NOT_FOUND", "Review not found", 404);

  const { rows: inserted } = await query<{ id: string }>(
    `INSERT INTO public.mess_review_replies (review_id, replier_id, replier_role, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [id, auth.userId, auth.role, body.trim().slice(0, 500)],
  );

  await addNotification(
    "user",
    rev[0].user_id,
    "mess_review_reply",
    "Mess incharge replied to your review",
    body!.trim().slice(0, 200),
  );
  await addAudit({
    action: "MESS_REVIEW_REPLIED",
    userId: auth.userId,
    role: auth.role,
    details: { reviewId: id, replyId: inserted[0]?.id },
  });

  return ok({ replyId: inserted[0]?.id });
}

export const POST = withAuthorization(handlePost);
