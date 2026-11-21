// /api/class-sessions/reviews/[reviewId]
//
// GET — fetch a single class-session review (the student's own, or an
// authority's view of any). Returns the rating, note (with any faculty
// reply appended under a "---" separator), + who replied. Closes the loop:
// a student can see the faculty's response to their review.
//
// Auth: a student may only read reviews whose student_id = caller (or that
// are anonymous and belong to them via the marker); authorities may read any.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["principal", "hod", "vp", "sysadmin", "admin"];

function getReviewId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const isAuthority = AUTHORITY.includes(auth.role);
  const reviewId = getReviewId(req);
  if (!reviewId) return fail("VALIDATION_ERROR", "reviewId missing", 400);

  const { rows } = await query<{
    id: string;
    session_id: string;
    session_date: string;
    period: number;
    rating: number;
    note: string | null;
    subject_code: string | null;
    faculty_id: string;
    faculty_name: string | null;
    is_anonymous: boolean;
    student_id: string | null;
    created_at: string;
  }>(
    `SELECT r.id::text, r.session_id, r.session_date::text, r.period, r.rating, r.note,
            r.subject_code, r.faculty_id::text, u.name AS faculty_name,
            r.is_anonymous, r.student_id::text, r.created_at::text
       FROM public.class_session_reviews r
       LEFT JOIN public.users u ON u.id = r.faculty_id
      WHERE r.id = $1 LIMIT 1`,
    [reviewId],
  );
  const r = rows[0];
  if (!r) return fail("NOT_FOUND", "Review not found", 404);

  // A student may only read their own review; an authority may read any.
  if (!isAuthority && r.student_id !== auth.userId) {
    return fail("FORBIDDEN", "You can only view your own reviews", 403);
  }

  // Split the faculty's reply (appended under "---") from the student's note.
  let studentNote = r.note ?? "";
  let facultyReply: string | null = null;
  const sep = "\n---\n";
  const idx = studentNote.lastIndexOf(sep);
  if (idx >= 0) {
    facultyReply = studentNote.slice(idx + sep.length).trim() || null;
    studentNote = studentNote.slice(0, idx).trim();
  }

  return ok({
    ...r,
    note: studentNote,
    facultyReply,
    hasReply: facultyReply !== null,
  });
}

export const GET = withAuthorization(handleGet);
