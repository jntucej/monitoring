// /api/assignments/[assignmentId]/grade/[studentId]
//
// PATCH { marks, feedback } — a faculty grades a student's submission.
// The assignment must belong to the grading faculty (or an authority). Sets
// status=GRADED + marks + feedback + graded_by + graded_at.

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { gradeAssignment } from "@/lib/assignments";
import { addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["hod", "vp", "principal", "admin", "sysadmin"];

function getIds(req: NextRequest): { assignmentId: string; studentId: string } {
  const seg = new URL(req.url).pathname.split("/").filter(Boolean);
  // .../assignments/<assignmentId>/grade/<studentId>
  return {
    assignmentId: decodeURIComponent(seg[seg.length - 2] ?? ""),
    studentId: decodeURIComponent(seg[seg.length - 1] ?? ""),
  };
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "faculty" && !AUTHORITY.includes(auth.role)) {
    return fail("FORBIDDEN", "Only faculty or an authority may grade", 403);
  }
  const { assignmentId, studentId } = getIds(req);
  if (!assignmentId || !studentId) return fail("MISSING_PARAM", "assignmentId and studentId required", 400);

  const body = (await req.json().catch(() => ({}))) as { marks?: number; feedback?: string };
  if (body.marks === undefined || isNaN(Number(body.marks))) {
    return fail("VALIDATION_ERROR", "marks (number) required", 400);
  }

  // Faculty may only grade their own assignment.
  if (auth.role === "faculty") {
    const { rows: [a] } = await query<{ faculty_id: string }>(
      `SELECT faculty_id::text FROM public.assignments WHERE id = $1::uuid LIMIT 1`,
      [assignmentId],
    );
    if (!a) return fail("NOT_FOUND", "Assignment not found", 404);
    if (a.faculty_id !== auth.userId) {
      return fail("FORBIDDEN", "This assignment belongs to another faculty", 403);
    }
  }

  const graded = await gradeAssignment({
    assignmentId,
    studentId,
    facultyId: auth.userId,
    marks: Number(body.marks),
    feedback: body.feedback?.slice(0, 1000),
  });
  if (!graded) {
    return fail("NOT_GRADEABLE", "No SUBMITTED/LATE submission for that student on this assignment", 409);
  }

  await addAudit({
    action: "ASSIGNMENT_GRADED",
    userId: auth.userId,
    role: auth.role,
    details: { assignmentId, studentId, marks: Number(body.marks) },
  });

  // Notify the student of their result (assignment.reply).
  await addNotification(
    "user", studentId, "assignment.reply",
    "Assignment graded",
    `Your submission was graded: ${Number(body.marks)}${body.feedback ? " — " + body.feedback.slice(0, 120) : ""}.`,
  );

  return ok({ assignmentId, studentId, marks: Number(body.marks) });
}

export const PATCH = withMutationGuard(handlePatch);
