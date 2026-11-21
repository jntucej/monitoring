// /api/assignments/[assignmentId]/submit
//
// POST — a student submits their assignment (optionally with an attachment,
// reusing the attachment-storage Saved shape). Marks the submission
// SUBMITTED, or LATE if past the due time. A student may only submit their
// own row (student_id = caller).

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { submitAssignment } from "@/lib/assignments";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getAssignmentId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student") {
    return fail("FORBIDDEN", "Only a student may submit an assignment", 403);
  }
  const assignmentId = getAssignmentId(req);
  if (!assignmentId) return fail("MISSING_PARAM", "assignmentId required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    attachment?: Record<string, unknown> | null;
  };

  // A student may only submit a submission row that is theirs.
  const { rows: mine } = await query<{ status: string }>(
    `SELECT status FROM public.assignment_submissions
      WHERE assignment_id = $1::uuid AND student_id = $2::uuid LIMIT 1`,
    [assignmentId, auth.userId],
  );
  if (mine.length === 0) {
    return fail("NOT_FOUND", "No submission record for you on this assignment", 404);
  }
  if (mine[0].status === "GRADED") {
    return fail("ALREADY_GRADED", "This assignment is already graded", 409);
  }

  const out = await submitAssignment({
    assignmentId,
    studentId: auth.userId,
    attachment: body.attachment ?? null,
  });

  await addAudit({
    action: "ASSIGNMENT_SUBMITTED",
    userId: auth.userId,
    role: auth.role,
    details: { assignmentId, late: out.late },
  });

  return ok({ assignmentId, status: out.status, late: out.late });
}

export const POST = withMutationGuard(handlePost);
