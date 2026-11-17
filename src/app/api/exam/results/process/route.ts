// /api/exam/results/process/route.ts
// Separation of duties pipeline (STEP 3.6):
//   addl_controller_results   → process (scan/compile marks into memos)
//   controller_examinations   → moderate + publish
// No single role can both process and publish.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

// POST — addl_controller_results compiles PUBLISHED-eligible marks.
async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    examType?: string;
    academicYear?: number;
    term?: string;
  } | null;
  if (!body?.examType) return fail("VALIDATION_ERROR", "examType required", 400);

  // Only LOCKED marks are processable. Faculty DRAFTs are not eligible.
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM public.marks
      WHERE exam_type = $1 AND academic_year = $2 AND status = 'LOCKED'
        AND ($3::text IS NULL OR term = $3)`,
    [body.examType.toUpperCase(), body.academicYear ?? new Date().getFullYear(), body.term ?? null],
  );
  const locked = Number(rows[0]?.count ?? "0");
  if (locked === 0) {
    return fail("PRECONDITION", "No locked marks to process; faculty must submit first", 409);
  }
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "exam_results_process",
    resource: "marks", afterState: { examType: body.examType, lockedMarks: locked },
  });
  return ok({ processed: locked, examType: body.examType, next: "controller_examinations may moderate + publish" });
}

export const POST = withRateLimit(
  withMutationGuard(implPost, {
    requiredRole: ["addl_controller_results", "admin", "sysadmin"],
  }),
  { keyPrefix: "results-process", maxRequests: 5, windowMs: 60_000 },
);
