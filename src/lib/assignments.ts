// src/lib/assignments.ts
//
// Flow B — assignment lifecycle. Two tables:
//   assignments            — faculty-created, one per class/subject
//   assignment_submissions — one row per (assignment, student), created
//                            eagerly on assignment creation (the attendance
//                            pattern: pre-create, then update status).
//
// Submission reuses the attachment-storage shape (jsonb attachment field).
// Grading reuses the marks/submit shape. "Confirm complete" is the
// faculty's honest answer to "has everyone submitted" — it reports the
// counts + the missing students, and can mark the outstanding PENDING ones
// as ABSENT (an explicit decision, not a silent "mark all done").

import { query } from "@/lib/postgres";

// ── Create ──────────────────────────────────────────────────────────────────

export interface CreateAssignmentInput {
  classId: string;
  subjectCode: string;
  facultyId: string;
  title: string;
  description?: string;
  dueAt: string;
  maxMarks?: number;
}

export async function createAssignment(input: CreateAssignmentInput): Promise<{
  assignmentId: string;
  studentCount: number;
}> {
  const { rows: [a] } = await query<{ id: string }>(
    `INSERT INTO public.assignments
       (class_id, subject_code, faculty_id, title, description, due_at, max_marks)
     VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6::timestamptz, $7)
     RETURNING id`,
    [input.classId, input.subjectCode, input.facultyId,
     input.title, input.description ?? null, input.dueAt, input.maxMarks ?? null],
  );
  const assignmentId = a.id;

  // Eagerly create one submission row per student in the class.
  const { rows: cls } = await query<{ section: string; year: number; department_id: string }>(
    `SELECT section::text, year::int, department_id::text FROM public.classes WHERE id = $1::uuid LIMIT 1`,
    [input.classId],
  );
  let studentCount = 0;
  const meta = cls[0];
  if (meta) {
    const { rows: students } = await query<{ user_id: string }>(
      `SELECT sd.user_id::text FROM public.student_details sd
        WHERE sd.section::text = $1 AND sd.year = $2 AND sd.branch::text = $3
          AND EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = sd.user_id::text
                      AND u.role = 'student' AND u.status = 'ACTIVE')`,
      [meta.section, meta.year, meta.department_id],
    );
    for (const s of students) {
      await query(
        `INSERT INTO public.assignment_submissions (assignment_id, student_id, status)
         VALUES ($1::uuid, $2::uuid, 'PENDING')
         ON CONFLICT (assignment_id, student_id) DO NOTHING`,
        [assignmentId, s.user_id],
      );
    }
    studentCount = students.length;
  }

  return { assignmentId, studentCount };
}

// ── List ────────────────────────────────────────────────────────────────────

export async function listAssignments(opts: {
  classId?: string;
  mineId?: string; // faculty's own id
  dueSoonMs?: number;
}): Promise<Array<{
  id: string; classId: string; subjectCode: string; facultyId: string;
  title: string; description: string | null; dueAt: string; maxMarks: number | null;
  submitted: number; total: number;
}>> {
  let where = "1=1";
  const params: unknown[] = [];
  if (opts.classId) { params.push(opts.classId); where += ` AND a.class_id = $${params.length}::uuid`; }
  if (opts.mineId) { params.push(opts.mineId); where += ` AND a.faculty_id = $${params.length}::uuid`; }

  const { rows } = await query<{
    id: string; class_id: string; subject_code: string; faculty_id: string;
    title: string; description: string | null; due_at: string; max_marks: number | null;
  }>(
    `SELECT a.id::text, a.class_id::text, a.subject_code, a.faculty_id::text,
            a.title, a.description, a.due_at::text, a.max_marks
       FROM public.assignments a
      WHERE ${where}
      ORDER BY a.due_at ASC`,
    params,
  );

  return Promise.all(
    rows.map(async (a) => {
      const { rows: counts } = await query<{ submitted: string; total: string }>(
        `SELECT count(*) FILTER (WHERE status IN ('SUBMITTED','LATE','GRADED'))::text AS submitted,
                count(*)::text AS total
           FROM public.assignment_submissions WHERE assignment_id = $1::uuid`,
        [a.id],
      );
      return {
        ...a,
        classId: a.class_id,
        subjectCode: a.subject_code,
        facultyId: a.faculty_id,
        dueAt: a.due_at,
        maxMarks: a.max_marks,
        submitted: Number(counts[0]?.submitted ?? 0),
        total: Number(counts[0]?.total ?? 0),
      };
    }),
  );
}

// ── Submit (student) ────────────────────────────────────────────────────────

export async function submitAssignment(input: {
  assignmentId: string;
  studentId: string;
  attachment?: Record<string, unknown> | null;
}): Promise<{ status: string; late: boolean }> {
  const { rows: [a] } = await query<{ due_at: string; status: string }>(
    `SELECT due_at::text AS due_at, 'live' AS status FROM public.assignments WHERE id = $1::uuid`,
    [input.assignmentId],
  );
  if (!a) throw new Error("Assignment not found");
  const late = new Date(a.due_at).getTime() < Date.now();
  const status = late ? "LATE" : "SUBMITTED";

  await query(
    `UPDATE public.assignment_submissions
        SET status = $2, submitted_at = NOW(), attachment = $3::jsonb
      WHERE assignment_id = $1::uuid AND student_id = $4::uuid`,
    [input.assignmentId, status, input.attachment ? JSON.stringify(input.attachment) : null, input.studentId],
  );
  return { status, late };
}

// ── Grade (faculty) ─────────────────────────────────────────────────────────

export async function gradeAssignment(input: {
  assignmentId: string;
  studentId: string;
  facultyId: string;
  marks: number;
  feedback?: string;
}): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE public.assignment_submissions
        SET status = 'GRADED', marks = $3, feedback = $4,
            graded_by = $5::uuid, graded_at = NOW()
      WHERE assignment_id = $1::uuid AND student_id = $2::uuid
        AND status IN ('SUBMITTED','LATE')`,
    [input.assignmentId, input.studentId, input.marks, input.feedback ?? null, input.facultyId],
  );
  return (rowCount ?? 0) > 0;
}

// ── Bulk grade / mark-absent ───────────────────────────────────────────────

export async function bulkGrade(input: {
  assignmentId: string;
  facultyId: string;
  updates: Array<{ studentId: string; marks: number; feedback?: string }>;
}): Promise<{ graded: number; failed: number }> {
  let graded = 0;
  let failed = 0;
  for (const u of input.updates) {
    const r = await gradeAssignment({
      assignmentId: input.assignmentId,
      studentId: u.studentId,
      facultyId: input.facultyId,
      marks: u.marks,
      feedback: u.feedback,
    });
    if (r) graded += 1;
    else failed += 1;
  }
  return { graded, failed };
}

export async function bulkMarkAbsent(input: {
  assignmentId: string;
  studentIds: string[];
}): Promise<number> {
  const { rowCount } = await query(
    `UPDATE public.assignment_submissions
        SET status = 'ABSENT', graded_at = NOW()
      WHERE assignment_id = $1::uuid AND student_id = ANY($2::uuid[])
        AND status = 'PENDING'`,
    [input.assignmentId, input.studentIds],
  );
  return rowCount ?? 0;
}

// ── Confirm complete (the "are all done?" report) ──────────────────────────

export async function confirmComplete(
  assignmentId: string,
): Promise<{
  total: number;
  submitted: number;
  pending: number;
  late: number;
  absent: number;
  graded: number;
  complete: boolean;
  missing: Array<{ studentId: string; roll: string | null; name: string | null }>;
}> {
  const { rows } = await query<{
    submitted: string; late: string; pending: string; absent: string; graded: string; total: string;
  }>(
    `SELECT
       count(*) FILTER (WHERE status = 'SUBMITTED')::text AS submitted,
       count(*) FILTER (WHERE status = 'LATE')::text AS late,
       count(*) FILTER (WHERE status = 'PENDING')::text AS pending,
       count(*) FILTER (WHERE status = 'ABSENT')::text AS absent,
       count(*) FILTER (WHERE status = 'GRADED')::text AS graded,
       count(*)::text AS total
      FROM public.assignment_submissions
     WHERE assignment_id = $1::uuid`,
    [assignmentId],
  );
  const c = rows[0];
  const missing = await query<{ student_id: string; roll: string | null; name: string | null }>(
    `SELECT asub.student_id::text AS student_id, sd.roll, u.name
       FROM public.assignment_submissions asub
       LEFT JOIN public.student_details sd ON sd.user_id = asub.student_id::uuid
       LEFT JOIN public.users u ON u.id = asub.student_id::uuid
      WHERE asub.assignment_id = $1::uuid AND asub.status = 'PENDING'
      ORDER BY u.name`,
    [assignmentId],
  );
  return {
    total: Number(c?.total ?? 0),
    submitted: Number(c?.submitted ?? 0),
    pending: Number(c?.pending ?? 0),
    late: Number(c?.late ?? 0),
    absent: Number(c?.absent ?? 0),
    graded: Number(c?.graded ?? 0),
    complete: Number(c?.pending ?? 0) === 0,
    missing: missing.rows.map((m) => ({ studentId: m.student_id, roll: m.roll, name: m.name })),
  };
}
