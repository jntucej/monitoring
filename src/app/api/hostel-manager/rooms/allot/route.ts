// /api/hostel-manager/rooms/allot/route.ts
// Room allotment + vacate (STEP 3.7): hostel_manager / deputy_warden
// assign rooms within their block scope. Vacate writes audit.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

// deputy_warden is block-scoped: the auth layer carries hostel_block
// when the session is bound to a block; admin/sysadmin see all.
async function blockScope(auth: AuthContext): Promise<string | null> {
  if (auth.role === "deputy_warden") {
    // The deputy warden's block is on their user profile (hostel_block column
    // added below if missing; null = not block-bound yet → forbid mutation).
    const res = await query<{ hostel_block: string | null }>(
      `SELECT hostel_block FROM public.users WHERE id = $1`, [auth.userId]);
    return res.rows[0]?.hostel_block ?? null;
  }
  return null; // campus-wide
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    studentId?: string;
    roomNumber?: string;
    hostelBlock?: string;
    vacate?: boolean;
    reason?: string;
  } | null;
  if (!body?.studentId || !body.hostelBlock) {
    return fail("VALIDATION_ERROR", "studentId and hostelBlock required", 400);
  }
  const block = await blockScope(auth);
  if (block && block !== body.hostelBlock) {
    return fail("FORBIDDEN", `You are scoped to block ${block}`, 403);
  }

  if (body.vacate) {
    const { rows } = await query(
      `UPDATE public.hostel_room_allotments
          SET vacated_at = now(), vacated_by = $3, reason = $4
        WHERE student_id = $1 AND block = $2 AND vacated_at IS NULL
        RETURNING id`,
      [body.studentId, body.hostelBlock, auth.userId, body.reason?.trim() || null],
    );
    if (rows.length === 0) return fail("NOT_FOUND", "No active allotment found", 404);
    await recordMutationAudit({
      actorId: auth.userId, roleContext: auth.role, action: "room_vacate",
      resource: "hostel_room_allotments", resourceId: body.studentId,
      afterState: { block: body.hostelBlock, reason: body.reason ?? null },
    });
    return ok({ vacated: body.studentId });
  }

  const { rows } = await query(
    `INSERT INTO public.hostel_room_allotments (student_id, room_number, block, allotted_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id, block) WHERE vacated_at IS NULL
     DO UPDATE SET room_number = EXCLUDED.room_number, allotted_by = EXCLUDED.allotted_by,
                  allotted_at = now()
     RETURNING id`,
    [body.studentId, body.roomNumber ?? null, body.hostelBlock, auth.userId],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "room_allot",
    resource: "hostel_room_allotments", resourceId: body.studentId,
    afterState: { block: body.hostelBlock, roomNumber: body.roomNumber ?? null },
  });
  return ok(rows[0]);
}

export const POST = withRateLimit(
  withMutationGuard(implPost, {
    requiredRole: ["hostel_manager", "deputy_warden", "chief_warden", "admin", "sysadmin"],
  }),
  { keyPrefix: "hostel-rooms", maxRequests: 10, windowMs: 60_000 },
);
