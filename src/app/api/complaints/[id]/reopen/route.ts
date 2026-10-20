// src/app/api/complaints/[id]/reopen/route.ts
// POST — student or authority reopens a closed/rejected complaint.
// Unlimited reopens; notifies principal when reopen count reaches 3+.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows: complaints } = await query<{
    raised_by: string | null;
    status: string;
    reopen_count: number;
    complaint_number: string;
    current_owner_role: string;
  }>(
    `SELECT raised_by, status, reopen_count, complaint_number, current_owner_role
       FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const complaint = complaints[0];
  if (!complaint) return fail("NOT_FOUND", "Complaint not found", 404);

  const isRaiser = complaint.raised_by === auth.userId;
  const isAdmin = ["admin", "sysadmin", "principal"].includes(auth.role);
  if (!isRaiser && !isAdmin) return fail("FORBIDDEN", "Not allowed to reopen", 403);

  if (!["closed", "rejected", "resolved"].includes(complaint.status)) {
    return fail("CANT_REOPEN", "Only closed or rejected complaints can be reopened", 409);
  }

  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

  const { rows: updated } = await query<{ reopen_count: number }>(
    `UPDATE public.complaints
        SET status = 'reopened',
            reopen_count = reopen_count + 1,
            updated_at = NOW()
      WHERE id = $1
      RETURNING reopen_count`,
    [complaintId],
  );
  const newCount = updated[0].reopen_count;

  await query(
    `INSERT INTO public.complaint_tasks (complaint_id, owner_role, action, status, notes)
     VALUES ($1, $2, 'Reopened complaint review', 'pending', $3)`,
    [complaintId, complaint.current_owner_role, reason ? `Reopen reason: ${reason}` : "Reopened by user"],
  );

  if (newCount >= 3) {
    await addNotification(
      "role",
      "principal",
      "complaint_reopened_often",
      `Complaint ${complaint.complaint_number} reopened ${newCount} times`,
      `This complaint has been reopened repeatedly. Consider principal review.`,
    );
  }

  await addAudit({
    action: "COMPLAINT_REOPENED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId, reopenCount: newCount, reason: reason ?? null },
  });

  return ok({ reopened: true, reopenCount: newCount });
}

export const POST = withAuthorization(handlePost);
