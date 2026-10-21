// src/app/api/mess/reviews/[id]/route.ts
// PATCH  — edit a review (owner, within 2h, max 3 edits).
// DELETE — retract a review (owner within 2h, or mess_incharge/admin/sysadmin anytime).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { isCleanComment } from "@/lib/profanity";
import type { AuthContext } from "@/lib/authContext";

const EDIT_WINDOW_MS = 2 * 3_600_000;
const MAX_EDITS = 3;
const STAFF = new Set(["mess_incharge", "admin", "sysadmin"]);

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const id = getId(req);
  const body = (await req.json().catch(() => ({}))) as {
    satisfaction?: string;
    comment?: string;
  };

  const { rows } = await query<{
    user_id: string;
    created_at: string;
    edit_count: number;
  }>(
    `SELECT user_id, created_at, edit_count
       FROM public.mess_meal_reviews
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return fail("NOT_FOUND", "Review not found", 404);
  if (row.user_id !== auth.userId && !STAFF.has(auth.role)) {
    return fail("FORBIDDEN", "Not your review", 403);
  }
  if (Date.now() - new Date(row.created_at).getTime() > EDIT_WINDOW_MS) {
    return fail("EDIT_WINDOW_CLOSED", "Reviews can only be edited within 2 hours", 422);
  }
  if (row.edit_count >= MAX_EDITS) {
    return fail("EDIT_LIMIT", "Max 3 edits per review", 429);
  }

  const satisfaction = body.satisfaction ?? null;
  const comment =
    body.comment != null ? String(body.comment).slice(0, 280) : null;

  // R11: same constructive-feedback screen as the submit path.
  const profanity = comment ? isCleanComment(comment) : null;
  if (profanity && !profanity.clean) {
    return fail("COMMENT_FLAGGED", "Please keep your feedback constructive.", 422);
  }

  await query(
    `UPDATE public.mess_meal_reviews
        SET satisfaction = COALESCE($2, satisfaction),
            comment      = COALESCE($3, comment),
            edited_at    = NOW(),
            edit_count   = edit_count + 1,
            updated_at   = NOW()
      WHERE id = $1`,
    [id, satisfaction, comment],
  );

  await addAudit({
    action: "MESS_REVIEW_EDITED",
    userId: auth.userId,
    role: auth.role,
    details: { reviewId: id, editCount: row.edit_count + 1 },
  });

  return ok({ edited: true });
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const id = getId(req);
  const { rows } = await query<{ user_id: string; created_at: string }>(
    `SELECT user_id, created_at
       FROM public.mess_meal_reviews
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return fail("NOT_FOUND", "Review not found", 404);

  const isOwner = row.user_id === auth.userId;
  const isStaff = STAFF.has(auth.role);
  if (!isOwner && !isStaff) return fail("FORBIDDEN", "Not allowed", 403);
  if (isOwner && Date.now() - new Date(row.created_at).getTime() > EDIT_WINDOW_MS) {
    return fail("RETRACT_WINDOW_CLOSED", "Reviews can only be retracted within 2 hours", 422);
  }

  await query(`UPDATE public.mess_meal_reviews SET deleted_at = NOW() WHERE id = $1`, [id]);
  await addAudit({
    action: "MESS_REVIEW_DELETED",
    userId: auth.userId,
    role: auth.role,
    details: { reviewId: id, byStaff: isStaff && !isOwner },
  });

  return ok({ deleted: true });
}

export const PATCH = withAuthorization(handlePatch);
export const DELETE = withAuthorization(handleDelete);
