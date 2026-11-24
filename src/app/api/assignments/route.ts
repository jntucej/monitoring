// /api/assignments
//
// GET  — list assignments (?classId= & mine=<facultyId> & scope=faculty|student).
//        A faculty lists their own; a student lists those for their classes.
// POST — faculty creates an assignment (copy the class-requests POST shape).
//        Eagerly creates one PENDING submission per student in the class.

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { createAssignment, listAssignments } from "@/lib/assignments";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["hod", "vp", "principal", "admin", "sysadmin"];

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? undefined;
  const scope = url.searchParams.get("scope");

  let results: Awaited<ReturnType<typeof listAssignments>> = [];
  try {
    if (["faculty", "subject_faculty"].includes(auth.role) || AUTHORITY.includes(auth.role)) {
      const isAuthority = AUTHORITY.includes(auth.role);
      const fid = url.searchParams.get("facultyId") ?? auth.userId;
      results = await listAssignments({ classId, mineId: isAuthority ? fid : auth.userId });
    } else {
      // Student: assignments for the classes they're enrolled in.
      if (!classId) return fail("VALIDATION_ERROR", "classId required for students", 400);
      results = await listAssignments({ classId });
      // Only assignments the student can see (their class).
    }
  } catch (err) {
    console.error("[api/assignments GET]", err);
    return ok({ assignments: [] });
  }

  return ok({ assignments: results });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["faculty", "subject_faculty"].includes(auth.role) && !AUTHORITY.includes(auth.role)) {
    return fail("FORBIDDEN", "Only faculty (or an authority) may create assignments", 403);
  }
  const body = (await req.json().catch(() => ({}))) as {
    classId?: string;
    subjectCode?: string;
    title?: string;
    description?: string;
    dueAt?: string;
    maxMarks?: number;
  };
  if (!body.classId || !body.subjectCode || !body.title || !body.dueAt) {
    return fail("VALIDATION_ERROR", "classId, subjectCode, title, dueAt required", 400);
  }
  const dueDate = new Date(body.dueAt);
  if (isNaN(dueDate.getTime())) return fail("VALIDATION_ERROR", "dueAt must be a valid date", 400);

  const out = await createAssignment({
    classId: body.classId,
    subjectCode: body.subjectCode,
    facultyId: auth.userId,
    title: body.title.slice(0, 200),
    description: body.description?.slice(0, 2000),
    dueAt: dueDate.toISOString(),
    maxMarks: body.maxMarks,
  });

  // Notify the class's students a new assignment is live.
  const { rows: cls } = await query<{ section: string; year: number; department_id: string }>(
    `SELECT section::text, year::int, department_id::text FROM public.classes WHERE id = $1::uuid LIMIT 1`,
    [body.classId],
  );
  const meta = cls[0];
  if (meta) {
    const { rows: students } = await query<{ user_id: string }>(
      `SELECT sd.user_id::text FROM public.student_details sd
        WHERE sd.section::text = $1 AND sd.year = $2 AND sd.branch::text = $3
          AND EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = sd.user_id::text
                      AND u.role = 'student' AND u.status = 'ACTIVE')
        LIMIT 500`,
      [meta.section, meta.year, meta.department_id],
    );
    const { addNotification } = await import("@/lib/db");
    for (const s of students) {
      await addNotification(
        "user", s.user_id, "assignment.created",
        `New assignment: ${body.title}`,
        `${body.title} is due ${dueDate.toLocaleDateString()}. Open to view and submit.`,
      );
    }
  }

  await addAudit({
    action: "ASSIGNMENT_CREATED",
    userId: auth.userId,
    role: auth.role,
    details: { assignmentId: out.assignmentId, classId: body.classId, title: body.title, studentCount: out.studentCount },
  });

  return ok(out);
}

export const GET = withAuthorization(handleGet);
export const POST = withMutationGuard(handlePost);
