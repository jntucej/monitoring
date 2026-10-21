// src/app/api/complaints/[id]/attachments/route.ts
// POST — upload multipart files as complaint attachments.
// GET  — list attachments (hiding internal evidence from students).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { saveAttachment, resolveStorage } from "@/lib/attachment-storage";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const MAX_FILES_PER_REQUEST = 5;

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
    id: string;
    raised_by: string | null;
    is_anonymous: boolean;
    visible_to_roles: string[];
    current_owner_role: string | null;
    status: string;
    deleted_at: string | null;
  }>(
    `SELECT id, raised_by, is_anonymous, visible_to_roles, current_owner_role, status, deleted_at
       FROM public.complaints WHERE id = $1 LIMIT 1`,
    [complaintId],
  );
  const row = complaints[0];
  if (!row) return fail("NOT_FOUND", "Complaint not found", 404);
  if (row.deleted_at) return fail("COMPLAINT_DELETED", "Complaint is deleted", 410);
  if (["closed", "rejected"].includes(row.status)) {
    return fail("COMPLAINT_CLOSED", "Cannot add attachments to a closed complaint", 409);
  }

  const isRaiser = row.raised_by === auth.userId;
  const isAuthority =
    row.visible_to_roles.includes(auth.role) || row.current_owner_role === auth.role;
  if (!isRaiser && !isAuthority) return fail("FORBIDDEN", "Not allowed", 403);

  const form = await req.formData().catch(() => null);
  if (!form) return fail("VALIDATION_ERROR", "multipart/form-data required", 400);

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail("VALIDATION_ERROR", "No files provided", 400);
  if (files.length > MAX_FILES_PER_REQUEST) {
    return fail("TOO_MANY_FILES", `Max ${MAX_FILES_PER_REQUEST} files per request`, 422);
  }

  const isInternal = form.get("internal") === "true" && isAuthority;
  await resolveStorage();

  const saved: Array<{ id: string; name: string; size: number }> = [];
  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await saveAttachment({
      complaintId,
      fileName: file.name || "upload",
      mimeType: file.type || "application/octet-stream",
      buffer: buf,
      stripExif: row.is_anonymous,
    });

    const { rows: inserted } = await query<{ id: string }>(
      `INSERT INTO public.complaint_attachments (
         complaint_id, uploaded_by, uploader_role, original_name, mime_type,
         size_bytes, sha256, storage_path, storage_kind, exif_stripped, is_internal
       ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        complaintId,
        auth.userId,
        auth.role,
        (file.name || "upload").slice(0, 200),
        file.type || "application/octet-stream",
        result.sizeBytes,
        result.sha256,
        result.storagePath,
        result.storageKind,
        result.exifStripped,
        isInternal,
      ],
    );
    saved.push({ id: inserted[0].id, name: file.name, size: result.sizeBytes });
  }

  await addAudit({
    action: "COMPLAINT_ATTACHMENTS_ADDED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId, count: saved.length, internal: isInternal },
  });

  return ok({ complaintId, attachments: saved });
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows: complaints } = await query<{ raised_by: string | null; visible_to_roles: string[] }>(
    `SELECT raised_by, visible_to_roles FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const row = complaints[0];
  if (!row) return fail("NOT_FOUND", "Complaint not found", 404);

  const isRaiser = row.raised_by === auth.userId;
  const isAuthority = row.visible_to_roles.includes(auth.role);
  if (!isRaiser && !isAuthority) return fail("FORBIDDEN", "Not allowed", 403);

  const { rows } = await query(
    `SELECT id, original_name AS name, mime_type AS "mimeType", size_bytes AS "sizeBytes",
            exif_stripped AS "exifStripped", is_internal AS internal,
            uploader_role AS "uploaderRole", created_at AS "createdAt"
       FROM public.complaint_attachments
      WHERE complaint_id = $1
        AND ($2::boolean = TRUE OR is_internal = FALSE)
      ORDER BY created_at ASC`,
    [complaintId, isAuthority],
  );

  return ok({ complaintId, attachments: rows });
}

export const POST = withAuthorization(handlePost);
export const GET = withAuthorization(handleGet);
