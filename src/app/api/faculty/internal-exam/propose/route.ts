// /api/faculty/internal-exam/propose/route.ts
// Faculty propose internal exam dates → HOD approves (STEP 3.2).
// Separation: faculty propose, HOD approves, exam branch schedules.

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
    classId?: string; subjectCode?: string; proposedDate?: string; notes?: string;
  } | null;
  if (!body?.classId || !body.proposedDate) {
    return fail("VALIDATION_ERROR", "classId and proposedDate are required", 400);
  }
  const { rows } = await query(
    `INSERT INTO public.internal_exam_proposals
       (faculty_id, class_id, subject_code, proposed_date, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, status`,
    [auth.userId, body.classId, body.subjectCode ?? null, body.proposedDate,
     body.notes?.trim() || null],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "internal_exam_propose",
    resource: "internal_exam_proposals", resourceId: rows[0].id,
    afterState: { classId: body.classId, proposedDate: body.proposedDate },
  });
  return ok(rows[0]);
}

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["faculty"] }),
  { keyPrefix: "internal-exam-propose", maxRequests: 10, windowMs: 60_000 },
);
