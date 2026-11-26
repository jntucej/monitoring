// /api/faculty/marks/route.ts
// Faculty marks entry (STEP 3.2 of IMPLEMENTATION_BLUEPRINT.md):
//
// GET  /api/faculty/marks?classId=...&examType=INTERNAL&academicYear=2027
//      → list marks the caller can see (their assigned classes only).
// POST /api/faculty/marks
//      { classId, subjectCode, examType, academicYear, term?, entries: [{studentId, score, maxMarks?}] }
//      → create DRAFT marks rows for the given students in the caller's class.
//
// POST /api/faculty/marks/submit
//      { examType, academicYear, term? } → lock all DRAFT marks of the
//      caller's classes for that exam window (status LOCKED, locked_by = caller).
//
// Control: only faculty whose faculty_assignments / class_teacher_id
// covers the class may write. addl_controller_academic may correct
// locked marks with a correction_reason (see /api/faculty/marks/correct).

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

/** Resolve the class ids the faculty is assigned to. */
async function assignedClassIds(auth: AuthContext): Promise<string[]> {
  const res = await query<{ class_id: string }>(
    `SELECT DISTINCT ca.class_id
       FROM public.faculty_assignments ca
      WHERE ca.faculty_id = $1 AND ca.status = 'ACTIVE'`,
    [auth.userId],
  );
  const fromAssignments = res.rows.map((r) => r.class_id);
  // Also classes where the faculty is the class teacher.
  const res2 = await query<{ id: string }>(
    `SELECT id FROM public.classes WHERE class_teacher_id = $1`,
    [auth.userId],
  );
  return [...new Set([...fromAssignments, ...res2.rows.map((r) => r.id)])];
}

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const classId = req.nextUrl.searchParams.get("classId");
  const classes = await assignedClassIds(auth);
  if (classes.length === 0) return ok({ marks: [] });

  let sql = `SELECT m.id, m.student_id, u.unique_id AS roll, u.name,
                    m.subject_code, m.exam_type, m.academic_year, m.term,
                    m.max_marks, m.score, m.status, m.entered_by, m.submitted_at
               FROM public.marks m
               JOIN public.users u ON u.id = m.student_id
              WHERE m.class_id = ANY ($1::uuid[])`;
  const params: unknown[] = [classes];
  if (classId) {
    if (!classes.includes(classId)) return fail("FORBIDDEN", "Not your class", 403);
    sql += ` AND m.class_id = $${params.push(classId)}::uuid`;
  }
  sql += " ORDER BY m.exam_type, m.academic_year, m.subject_code, u.name";
  const { rows } = await query(sql, params);
  return ok({ marks: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    classId?: string;
    subjectCode?: string;
    examType?: string;
    academicYear?: number;
    term?: string;
    entries?: { studentId: string; score: number; maxMarks?: number }[];
  } | null;

  if (!body || !body.classId || !body.entries?.length) {
    return fail("VALIDATION_ERROR", "classId and entries[] are required", 400);
  }
  const classes = await assignedClassIds(auth);
  if (!classes.includes(body.classId)) {
    return fail("FORBIDDEN", "Class is not assigned to you", 403);
  }
  const examType = (body.examType ?? "INTERNAL").toUpperCase();
  if (!["INTERNAL", "EXTERNAL", "CONTINUOUS"].includes(examType)) {
    return fail("VALIDATION_ERROR", "examType must be INTERNAL | EXTERNAL | CONTINUOUS", 400);
  }
  const academicYear = body.academicYear ?? new Date().getFullYear();

  let inserted = 0;
  for (const e of body.entries) {
    const res = await query(
      `INSERT INTO public.marks
         (student_id, class_id, subject_code, exam_type, academic_year, term,
          max_marks, score, status, entered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT', $9)
       ON CONFLICT (student_id, subject_code, exam_type, academic_year, term)
       DO UPDATE SET score = EXCLUDED.score, max_marks = EXCLUDED.max_marks,
                     status = 'DRAFT', updated_at = now()
       RETURNING id`,
      [e.studentId, body.classId, body.subjectCode ?? null, examType, academicYear,
       body.term ?? null, e.maxMarks ?? 100, e.score, auth.userId],
    );
    if (res.rows.length > 0) inserted += 1;
  }

  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "faculty_marks_enter",
    resource: "marks", resourceId: body.classId,
    afterState: { classId: body.classId, examType, academicYear, inserted },
  });

  return ok({ inserted, classId: body.classId, examType });
}

export const GET = withApiChain(implGet, {
  route: "/api/faculty/marks",
  auth: "user",
  requiredRole: ["faculty", "hod", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "faculty-marks-get", maxRequests: 30, windowMs: 60_000 },
});

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["faculty"] }),
  { keyPrefix: "faculty-marks-post", maxRequests: 10, windowMs: 60_000 },
);
