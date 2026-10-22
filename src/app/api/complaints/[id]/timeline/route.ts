// src/app/api/complaints/[id]/timeline/route.ts
// GET — timeline of task actions, status updates, and feedback for a complaint.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows: complaints } = await query<{ raised_by: string | null; visible_to_roles: string[]; current_owner_role: string | null }>(
    `SELECT raised_by, visible_to_roles, current_owner_role FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const complaint = complaints[0];
  if (!complaint) return fail("NOT_FOUND", "Not found", 404);

  const isRaiser = complaint.raised_by === auth.userId;
  const isAuthority = complaint.visible_to_roles.includes(auth.role) || complaint.current_owner_role === auth.role;
  if (!isRaiser && !isAuthority) return fail("FORBIDDEN", "Not allowed", 403);

  const includeNotes = isAuthority || isRaiser;
  const { rows: tasks } = await query(
    `SELECT id, owner_role AS "ownerRole", action, status,
            CASE WHEN $2 THEN notes ELSE NULL END AS notes,
            due_at AS "dueAt", completed_at AS "completedAt", created_at AS "createdAt"
       FROM public.complaint_tasks
      WHERE complaint_id = $1
      ORDER BY created_at ASC`,
    [complaintId, includeNotes],
  );

  const { rows: feedback } = await query(
    `SELECT rating, comment, created_at AS "createdAt" FROM public.complaint_feedback WHERE complaint_id = $1 LIMIT 1`,
    [complaintId],
  );

  return ok({ complaintId, tasks, feedback: feedback[0] ?? null });
}

export const GET = withAuthorization(handleGet);
