/**
 * POST /api/student/facility-feedback — submit a facility rating + comment.
 * GET /api/student/facility-feedback — list this student's own feedback.
 *
 * Backed by campus_facility_feedback (migration 20270131000049).
 */
import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface FeedbackRow {
  id: string;
  facility_type: string;
  block_or_room: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { rows } = await query<FeedbackRow>(
    `SELECT id::text, facility_type, block_or_room, rating, comment, created_at
       FROM public.campus_facility_feedback
      WHERE student_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 25`,
    [ctx.auth.userId],
  );
  return ok({ feedback: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  const facilityType = String(body.facility_type ?? "").trim();
  const blockOrRoom = body.block_or_room ? String(body.block_or_room).trim() : null;
  const rating = Number(body.rating);
  const comment = body.comment ? String(body.comment).trim() : null;

  if (!facilityType) return fail("VALIDATION", "facility_type is required");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail("VALIDATION", "rating must be an integer 1-5");
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.campus_facility_feedback
        (student_id, facility_type, block_or_room, rating, comment)
     VALUES ($1::uuid, $2, $3, $4, $5)
     RETURNING id::text AS id`,
    [ctx.auth.userId, facilityType, blockOrRoom, rating, comment],
  );
  return ok({ id: rows[0].id });
}

export const GET = withApiChain(implGet, {
  route: "/api/student/facility-feedback",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "student_facility_read", maxRequests: 60 },
});
export const POST = withMutationGuard(implPost, {
  requiredRole: ["student"],
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
});
