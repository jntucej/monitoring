// /api/student/marks/route.ts
// Read-only grade card: only PUBLISHED marks are visible (STEP 3.1).
// Drafts/submitted/locked marks stay invisible to the student.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query<{
    subject_code: string | null; exam_type: string; academic_year: number;
    term: string | null; max_marks: string; score: string | null;
    published_at: string | null;
  }>(
    `SELECT subject_code, exam_type, academic_year, term, max_marks::text AS max_marks,
            score::text AS score, published_at
       FROM public.marks
      WHERE student_id = $1 AND status = 'PUBLISHED'
      ORDER BY academic_year DESC, exam_type, term NULLS LAST`,
    [auth.userId],
  );
  return ok({
    userId: auth.userId,
    gradeCard: rows.map((r) => ({
      subject: r.subject_code, examType: r.exam_type,
      academicYear: r.academic_year, term: r.term,
      maxMarks: Number(r.max_marks), score: r.score === null ? null : Number(r.score),
      publishedAt: r.published_at,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "parent", "guardian", "hod", "admin", "sysadmin"] }),
  { keyPrefix: "student-marks", maxRequests: 30, windowMs: 60_000 },
);
