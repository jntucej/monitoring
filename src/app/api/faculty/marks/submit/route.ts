// /api/faculty/marks/submit/route.ts
// POST — lock all DRAFT marks of the caller's classes for an exam window.
// After lock, corrections route through addl_controller_academic only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    examType?: string;
    academicYear?: number;
    term?: string;
  } | null;
  if (!body?.examType) return fail("VALIDATION_ERROR", "examType is required", 400);

  const res = await query(
    `UPDATE public.marks
        SET status = 'LOCKED', locked_by = $5, locked_at = now()
      WHERE class_id = ANY ($1::uuid[])
        AND exam_type = $2
        AND academic_year = $3
        AND ($4::text IS NULL OR term = $4)
        AND status = 'DRAFT'
      RETURNING id`,
    // class ids fetched the same way as the marks route; re-run here
    [
      (await query<{ class_id: string }>(
        `SELECT DISTINCT class_id FROM public.faculty_assignments
          WHERE faculty_id = $1 AND status = 'ACTIVE'`, [auth.userId]))
       .rows.map((r) => r.class_id),
      body.examType.toUpperCase(),
      body.academicYear ?? new Date().getFullYear(),
      body.term ?? null,
      auth.userId,
    ],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "faculty_marks_submit",
    resource: "marks", afterState: { locked: res.rows.length, examType: body.examType },
  });
  return ok({ locked: res.rows.length });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["faculty", "hod"],
  rateLimit: { keyPrefix: "faculty-marks-submit", maxRequests: 5 },
});
