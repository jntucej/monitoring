// /api/assignments/[assignmentId]/bulk-grade
//
// POST { updates: [{ studentId, marks, feedback }] } — bulk-grade many
// submissions at once (the real pain point: a faculty grading 40 one at a
// time). The action is idempotent per-student; returns per-item results.
// Faculty may only bulk-grade their own assignment.

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { bulkGrade } from "@/lib/assignments";
import { addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["hod", "vp", "principal", "admin", "sysadmin"];
const MAX_UPDATES = 100;

function getAssignmentId(req: NextRequest): string {
  const seg = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(seg[seg.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "faculty" && !AUTHORITY.includes(auth.role)) {
    return fail("FORBIDDEN", "Only faculty or an authority may bulk-grade", 403);
  }
  const assignmentId = getAssignmentId(req);
  if (!assignmentId) return fail("MISSING_PARAM", "assignmentId required", 400);

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

  const body = (await req.json().catch(() => ({}))) as {
    updates?: Array<{ studentId: string; marks: number; feedback?: string }>;
  };
  const updates = body.updates ?? [];
  if (updates.length === 0) return fail("VALIDATION_ERROR", "updates required", 400);
  if (updates.length > MAX_UPDATES) {
    return fail("VALIDATION_ERROR", `Too many updates (max ${MAX_UPDATES})`, 400);
  }

  const result = await bulkGrade({
    assignmentId,
    facultyId: auth.userId,
    updates: updates.map((u) => ({
      studentId: u.studentId,
      marks: Number(u.marks),
      feedback: u.feedback?.slice(0, 1000),
    })),
  });

  // Notify each graded student (assignment.reply).
  for (const u of updates) {
    if (result.graded > 0) {
      await addNotification(
        "user", u.studentId, "assignment.reply",
        "Assignment graded",
        `Your submission was graded: ${Number(u.marks)}${u.feedback ? " — " + u.feedback.slice(0, 120) : ""}.`,
      );
    }
  }

  await addAudit({
    action: "ASSIGNMENT_BULK_GRADED",
    userId: auth.userId,
    role: auth.role,
    details: { assignmentId, graded: result.graded, failed: result.failed },
  });

  return ok(result);
}

export const POST = withMutationGuard(handlePost);
