// /api/exam/hall-tickets/generate/route.ts
// addl_controller_automation: bulk hall ticket generation for an exam.
// Body: { examId, students: [{studentId, hall?, seatNo?}] }
// Seats can be left null for center jumbling (assigned later by seating plan).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    examId?: string;
    students?: { studentId: string; hall?: string; seatNo?: string }[];
  } | null;
  if (!body?.examId || !body.students?.length) {
    return fail("VALIDATION_ERROR", "examId and students[] are required", 400);
  }
  let issued = 0;
  for (const s of body.students) {
    const res = await query(
      `INSERT INTO public.hall_tickets (exam_id, student_id, hall, seat_no, generated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (exam_id, student_id)
       DO UPDATE SET hall = COALESCE(EXCLUDED.hall, public.hall_tickets.hall),
                    seat_no = COALESCE(EXCLUDED.seat_no, public.hall_tickets.seat_no),
                    status = 'ISSUED', generated_by = EXCLUDED.generated_by
       RETURNING id`,
      [body.examId, s.studentId, s.hall ?? null, s.seatNo ?? null, auth.userId],
    );
    if (res.rows.length > 0) issued += 1;
  }
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "hall_tickets_generate",
    resource: "hall_tickets", resourceId: body.examId,
    afterState: { examId: body.examId, issued },
  });
  return ok({ examId: body.examId, issued });
}

export const POST = withRateLimit(
  withMutationGuard(implPost, {
    requiredRole: ["addl_controller_automation", "exam_branch", "admin", "sysadmin"],
  }),
  { keyPrefix: "hall-tickets-gen", maxRequests: 10, windowMs: 60_000 },
);
