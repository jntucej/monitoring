// /api/exam/results/publish/route.ts
// controller_examinations only: final sign-off + publish.
// After publish, marks status → PUBLISHED and students/parents can view.

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
    examType?: string;
    academicYear?: number;
    term?: string;
    signOffNote?: string;
  } | null;
  if (!body?.examType) return fail("VALIDATION_ERROR", "examType required", 400);

  const { rows } = await query(
    `UPDATE public.marks
        SET status = 'PUBLISHED', published_at = now()
      WHERE exam_type = $1 AND academic_year = $2 AND status = 'LOCKED'
        AND ($3::text IS NULL OR term = $3)
      RETURNING id`,
    [body.examType.toUpperCase(), body.academicYear ?? new Date().getFullYear(), body.term ?? null],
  );
  const published = rows.length;
  if (published === 0) {
    return fail("PRECONDITION", "Nothing to publish — process the marks first", 409);
  }
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "exam_results_publish",
    resource: "marks",
    afterState: { examType: body.examType, published, signOffNote: body.signOffNote ?? null },
  });
  return ok({ published, examType: body.examType });
}

export const POST = withRateLimit(
  withMutationGuard(implPost, {
    requiredRole: ["controller_examinations", "admin", "sysadmin"],
  }),
  { keyPrefix: "results-publish", maxRequests: 3, windowMs: 60_000 },
);
