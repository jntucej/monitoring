// /api/assignments/[assignmentId]/confirm-complete
//
// POST { markPendingAbsent?: boolean } — the faculty's "are all done?"
// report. Computes the submitted/pending/late/absent counts + who's missing.
// With markPendingAbsent=true, it explicitly records the outstanding PENDING
// students as ABSENT (the real decision — not a silent "mark all done").
// Irreversible-enough to deserve a confirm dialog on the UI side.

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { confirmComplete, bulkMarkAbsent } from "@/lib/assignments";
import { addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["hod", "vp", "principal", "admin", "sysadmin"];

function getAssignmentId(req: NextRequest): string {
  const seg = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(seg[seg.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "faculty" && !AUTHORITY.includes(auth.role)) {
    return fail("FORBIDDEN", "Only faculty or an authority may confirm completion", 403);
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

  const body = (await req.json().catch(() => ({}))) as { markPendingAbsent?: boolean };
  const report = await confirmComplete(assignmentId);

  let markedAbsent = 0;
  if (body.markPendingAbsent && report.pending > 0) {
    const { rows: missing } = await query<{ student_id: string }>(
      `SELECT student_id::text FROM public.assignment_submissions
        WHERE assignment_id = $1::uuid AND status = 'PENDING'`,
      [assignmentId],
    );
    markedAbsent = await bulkMarkAbsent({
      assignmentId,
      studentIds: missing.map((m) => m.student_id),
    });
    report.absent += markedAbsent;
    report.pending -= markedAbsent;
    report.complete = report.pending === 0;
  }

  await addAudit({
    action: "ASSIGNMENT_CONFIRM_COMPLETE",
    userId: auth.userId,
    role: auth.role,
    details: {
      assignmentId,
      total: report.total,
      submitted: report.submitted,
      pending: report.pending,
      markedAbsent,
      complete: report.complete,
    },
  });

  return ok({
    ...report,
    missing: report.missing,
    markedAbsent,
  });
}

export const POST = withMutationGuard(handlePost);
