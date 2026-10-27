// src/app/api/complaints/[id]/route.ts
// GET   — complaint detail + tasks + attachments + feedback + cctv refs.
// PATCH — workflow actions (acknowledge, start, resolve, reject, escalate, add_note).
// DELETE — soft delete.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit, addNotification } from "@/lib/db";
import { getChain } from "@/lib/complaint-taxonomy";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows: complaints } = await query<any>(
    `SELECT c.*, cc.label AS "categoryLabel", cc.domain AS "categoryDomain",
            CASE WHEN c.is_anonymous THEN NULL ELSE u.name END AS "raisedByName",
            CASE WHEN c.is_anonymous THEN NULL ELSE u.unique_id END AS "raisedByRoll"
       FROM public.complaints c
       JOIN public.complaint_categories cc ON cc.code = c.category_code
       LEFT JOIN public.users u ON u.id = c.raised_by
      WHERE c.id = $1 AND c.deleted_at IS NULL
      LIMIT 1`,
    [complaintId],
  );
  const complaint = complaints[0];
  if (!complaint) return fail("NOT_FOUND", "Complaint not found", 404);

  const isRaiser = complaint.raised_by === auth.userId;
  const isAuthority =
    complaint.visible_to_roles.includes(auth.role) || complaint.current_owner_role === auth.role;
  if (!isRaiser && !isAuthority) return fail("FORBIDDEN", "Not allowed", 403);

  // Record viewer & first read state
  if (auth.role !== "student") {
    await query(
      `INSERT INTO public.complaint_viewers (complaint_id, user_id, viewer_role, first_viewed_at, last_viewed_at, view_count)
       VALUES ($1, $2, $3, NOW(), NOW(), 1)
       ON CONFLICT (complaint_id, user_id) DO UPDATE
         SET last_viewed_at = NOW(), view_count = complaint_viewers.view_count + 1`,
      [complaintId, auth.userId, auth.role],
    );
    await query(
      `UPDATE public.complaints
          SET first_read_at = COALESCE(first_read_at, NOW()),
              read_by_roles = CASE
                WHEN $2 = ANY(read_by_roles) THEN read_by_roles
                ELSE array_append(read_by_roles, $2)
              END
        WHERE id = $1`,
      [complaintId, auth.role],
    );
  }

  // Tasks
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

  // Attachments (students don't see internal evidence)
  const { rows: attachments } = await query(
    `SELECT id, original_name AS name, mime_type AS "mimeType", size_bytes AS "sizeBytes",
            exif_stripped AS "exifStripped", is_internal AS internal,
            uploader_role AS "uploaderRole", created_at AS "createdAt"
       FROM public.complaint_attachments
      WHERE complaint_id = $1 AND ($2 = TRUE OR is_internal = FALSE)
      ORDER BY created_at ASC`,
    [complaintId, isAuthority],
  );

  // Feedback
  const { rows: feedback } = await query(
    `SELECT rating, comment, created_at AS "createdAt" FROM public.complaint_feedback WHERE complaint_id = $1 LIMIT 1`,
    [complaintId],
  );

  // CCTV refs (authorities only)
  const { rows: cctvRefs } = isAuthority
    ? await query(
        `SELECT id, camera_id AS "cameraId", location, clip_start AS "clipStart", clip_end AS "clipEnd", clip_url AS "clipUrl", notes, created_at AS "createdAt"
           FROM public.complaint_cctv_refs WHERE complaint_id = $1 ORDER BY created_at ASC`,
        [complaintId],
      )
    : { rows: [] };

  return ok({
    complaint,
    tasks,
    attachments,
    feedback: feedback[0] ?? null,
    cctvRefs,
  });
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    resolutionSummary?: string;
    note?: string;
    targetRole?: string;
  };

  const { rows: complaints } = await query<any>(
    `SELECT * FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const c = complaints[0];
  if (!c) return fail("NOT_FOUND", "Complaint not found", 404);

  const isAuthority = c.visible_to_roles.includes(auth.role) || c.current_owner_role === auth.role;
  const isRaiser = c.raised_by === auth.userId;
  if (!isAuthority && !isRaiser) return fail("FORBIDDEN", "Not allowed", 403);

  const action = body.action;
  if (!action) return fail("VALIDATION_ERROR", "action required", 400);

  if (action === "add_note") {
    if (!body.note || !body.note.trim()) return fail("VALIDATION_ERROR", "note required", 400);
    await query(
      `INSERT INTO public.complaint_tasks (complaint_id, owner_role, owner_user_id, action, status, notes, completed_at)
       VALUES ($1, $2, $3, 'Note added', 'done', $4, NOW())`,
      [complaintId, auth.role, auth.userId, body.note.trim().slice(0, 2000)],
    );
    await addAudit({
      action: "COMPLAINT_COMMENT_ADDED",
      userId: auth.userId,
      role: auth.role as Role,
      details: { complaintId },
    });
    return ok({ updated: true });
  }

  if (!isAuthority) return fail("FORBIDDEN", "Only authorities can perform workflow actions", 403);

  let newStatus = c.status;
  let newOwner = c.current_owner_role;
  let resolutionSummary = c.resolution_summary;
  let closedAt = c.closed_at;
  let resolvedAt = c.resolved_at;

  const chain = await getChain(c.category_code);

  if (action === "acknowledge") {
    newStatus = "acknowledged";
  } else if (action === "start") {
    newStatus = "in_progress";
  } else if (action === "resolve") {
    if (!body.resolutionSummary || !body.resolutionSummary.trim()) {
      return fail("VALIDATION_ERROR", "resolutionSummary required to resolve", 400);
    }
    resolutionSummary = body.resolutionSummary.trim().slice(0, 2000);
    newStatus = "awaiting_verification";
    resolvedAt = new Date().toISOString();
  } else if (action === "reject") {
    newStatus = "rejected";
    closedAt = new Date().toISOString();
  } else if (action === "escalate" || action === "transfer") {
    const targetRole = body.targetRole;
    const currentIndex = chain.findIndex((s) => s.role === c.current_owner_role);
    let nextStep = chain[currentIndex + 1];
    if (targetRole) {
      const found = chain.find((s) => s.role === targetRole);
      if (found) nextStep = found;
    }
    if (!nextStep) {
      return fail("CANNOT_ESCALATE", "Already at highest escalation tier", 409);
    }
    newOwner = nextStep.role;
    newStatus = "assigned";
    const slaDeadline = new Date(Date.now() + nextStep.slaHours * 3_600_000).toISOString();
    await query(
      `UPDATE public.complaints SET sla_deadline = $2, escalation_level = escalation_level + 1 WHERE id = $1`,
      [complaintId, slaDeadline],
    );
    await query(
      `INSERT INTO public.complaint_tasks (complaint_id, owner_role, action, status, due_at)
       VALUES ($1, $2, 'Investigate escalated complaint', 'pending', $3)`,
      [complaintId, nextStep.role, slaDeadline],
    );
    await addNotification(
      "role",
      nextStep.role,
      "complaint_escalated",
      `Complaint Escalated: ${c.complaint_number}`,
      `Complaint ${c.complaint_number} was forwarded/escalated to your role queue.`,
    );
  }

  await query(
    `UPDATE public.complaints
        SET status = $2, current_owner_role = $3, resolution_summary = $4,
            resolved_at = $5::timestamptz, closed_at = $6::timestamptz, updated_at = NOW()
      WHERE id = $1`,
    [complaintId, newStatus, newOwner, resolutionSummary, resolvedAt, closedAt],
  );

  if (c.raised_by) {
    await addNotification(
      "user",
      c.raised_by,
      "complaint_updated",
      `Complaint Updated: ${c.complaint_number}`,
      `Your complaint status changed to: ${newStatus}`,
    );
  }

  await addAudit({
    action: `COMPLAINT_${action.toUpperCase()}`,
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId, status: newStatus, owner: newOwner },
  });

  return ok({ complaintId, status: newStatus, currentOwnerRole: newOwner });
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows } = await query<{ raised_by: string | null; status: string }>(
    `SELECT raised_by, status FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const row = rows[0];
  if (!row) return fail("NOT_FOUND", "Complaint not found", 404);

  const isRaiser = row.raised_by === auth.userId;
  const isAdmin = ["admin", "sysadmin"].includes(auth.role);
  if (!isRaiser && !isAdmin) return fail("FORBIDDEN", "Not allowed", 403);

  if (isRaiser && !isAdmin && !["submitted", "acknowledged"].includes(row.status)) {
    return fail("CANT_DELETE_IN_PROGRESS", "Cannot delete once the complaint is in progress", 409);
  }

  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

  await query(
    `UPDATE public.complaints
        SET deleted_at = NOW(), deleted_by = $2::uuid, deleted_reason = $3, updated_at = NOW()
      WHERE id = $1`,
    [complaintId, auth.userId, reason?.slice(0, 500) ?? null],
  );

  await addAudit({
    action: "COMPLAINT_SOFT_DELETED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId, byAdmin: isAdmin },
  });

  return ok({ deleted: true });
}

export const GET = withAuthorization(handleGet);
export const PATCH = withAuthorization(handlePatch);
export const DELETE = withAuthorization(handleDelete);
