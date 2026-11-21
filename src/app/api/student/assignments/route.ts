// /api/student/assignments
//
// GET — the calling student's own assignments, joined with their own
// submission status (PENDING/SUBMITTED/LATE/GRADED/ABSENT) + marks/feedback.
// Drives the thin student/assignments page. A student sees only assignments
// for the classes they're enrolled in.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student") {
    return fail("FORBIDDEN", "Student endpoint", 403);
  }

  // The student's classes (from student_details section/year/branch).
  const { rows: sd } = await query<{ user_id: string; section: string; year: number; branch: string }>(
    `SELECT user_id::text, section::text, year::int, branch::text
       FROM public.student_details WHERE user_id = $1::uuid LIMIT 1`,
    [auth.userId],
  );
  if (sd.length === 0) return ok({ assignments: [] });
  const s = sd[0];

  // Assignments for the classes matching this student's section/year/branch
  // (classes.department_id is the branch code — the same join the class
  // reminders cron uses).
  const { rows: assignments } = await query<{
    id: string; class_id: string; title: string; description: string | null;
    due_at: string; max_marks: number | null; subject_code: string;
  }>(
    `SELECT a.id::text, a.class_id::text, a.title, a.description,
            a.due_at::text, a.max_marks, a.subject_code
       FROM public.assignments a
       JOIN public.classes c ON c.id = a.class_id
      WHERE c.section::text = $1 AND c.year = $2 AND c.department_id::text = $3
      ORDER BY a.due_at ASC`,
    [s.section, s.year, s.branch],
  );

  // The student's own submission row per assignment.
  const out = [];
  for (const a of assignments) {
    const { rows: sub } = await query<{ status: string; marks: number | null; feedback: string | null }>(
      `SELECT status, marks, feedback
         FROM public.assignment_submissions
        WHERE assignment_id = $1::uuid AND student_id = $2::uuid
        LIMIT 1`,
      [a.id, auth.userId],
    );
    out.push({
      id: a.id,
      classId: a.class_id,
      subjectCode: a.subject_code,
      title: a.title,
      description: a.description,
      dueAt: a.due_at,
      maxMarks: a.max_marks,
      myStatus: sub[0]?.status ?? "PENDING",
      myMarks: sub[0]?.marks ?? null,
      myFeedback: sub[0]?.feedback ?? null,
      submitted: 0,
      total: 0,
    });
  }

  return ok({ assignments: out });
}

export const GET = withAuthorization(handleGet);
