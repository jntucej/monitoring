// src/app/api/complaints/[id]/attachments/[attId]/route.ts
// GET    — download attachment file.
// DELETE — remove attachment.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { readAttachment, deleteAttachmentFile } from "@/lib/attachment-storage";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getIds(req: NextRequest): { complaintId: string; attId: string } {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  return {
    complaintId: parts[parts.length - 3] ?? "",
    attId: parts[parts.length - 1] ?? "",
  };
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const { complaintId, attId } = getIds(req);
  if (!complaintId || !attId) return fail("VALIDATION_ERROR", "IDs required", 400);

  const { rows: complaints } = await query<{ raised_by: string | null; visible_to_roles: string[] }>(
    `SELECT raised_by, visible_to_roles FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const complaint = complaints[0];
  if (!complaint) return fail("NOT_FOUND", "Complaint not found", 404);

  const isRaiser = complaint.raised_by === auth.userId;
  const isAuthority = complaint.visible_to_roles.includes(auth.role);
  if (!isRaiser && !isAuthority) return fail("FORBIDDEN", "Not allowed", 403);

  const { rows: attachments } = await query<{
    original_name: string;
    mime_type: string;
    storage_path: string;
    is_internal: boolean;
  }>(
    `SELECT original_name, mime_type, storage_path, is_internal
       FROM public.complaint_attachments
      WHERE id = $1 AND complaint_id = $2
      LIMIT 1`,
    [attId, complaintId],
  );
  const att = attachments[0];
  if (!att) return fail("NOT_FOUND", "Attachment not found", 404);

  if (att.is_internal && !isAuthority) {
    return fail("FORBIDDEN", "Internal attachment", 403);
  }

  const buf = await readAttachment(att.storage_path);
  if (!buf) return fail("FILE_MISSING", "File no longer on storage", 410);

  const SAFE_INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
  const isInline = SAFE_INLINE_TYPES.has((att.mime_type || "").toLowerCase().trim());
  const contentType = isInline ? att.mime_type : "application/octet-stream";
  const disposition = isInline ? "inline" : "attachment";
  const safeFilename = att.original_name.replace(/[^a-zA-Z0-9._-]/g, "_");

  return new Response(buf as unknown as BodyInit, {
    headers: {
      "content-type": contentType,
      "content-length": String(buf.length),
      "content-disposition": `${disposition}; filename="${safeFilename}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=300",
    },
  });
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { complaintId, attId } = getIds(req);
  if (!complaintId || !attId) return fail("VALIDATION_ERROR", "IDs required", 400);

  const { rows } = await query<{ uploaded_by: string | null; storage_path: string }>(
    `SELECT uploaded_by, storage_path FROM public.complaint_attachments WHERE id = $1 AND complaint_id = $2 LIMIT 1`,
    [attId, complaintId],
  );
  const att = rows[0];
  if (!att) return fail("NOT_FOUND", "Attachment not found", 404);

  const isUploader = att.uploaded_by === auth.userId;
  const isAdmin = ["admin", "sysadmin", "principal"].includes(auth.role);
  if (!isUploader && !isAdmin) return fail("FORBIDDEN", "Not allowed", 403);

  await query(`DELETE FROM public.complaint_attachments WHERE id = $1`, [attId]);
  await deleteAttachmentFile(att.storage_path);

  await addAudit({
    action: "COMPLAINT_ATTACHMENT_DELETED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId, attId },
  });

  return ok({ deleted: true });
}

export const GET = withAuthorization(handleGet);
export const DELETE = withAuthorization(handleDelete);
