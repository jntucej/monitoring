import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { appendStageHistory, getScopedTicket } from "@/lib/permission-workflow";
import { addAudit, addNotification } from "@/lib/db";
import type { Role } from "@/lib/types";
import {
  ensureTicketDir,
  documentPath,
} from "@/lib/permission-document";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function getTicketParam(req: NextRequest): string {
  // pathname: /api/permissions/{ticket}/upload → second-to-last segment
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] || "");
}

async function handlePost(req: NextRequest): Promise<Response> {
  const ticketParam = getTicketParam(req);
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";
  const authUserEmail = req.headers.get("x-user-email") || "";

  if (!ticketParam) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Ticket parameter required" } },
      { status: 400 }
    );
  }

  const scope = await getScopedTicket(ticketParam, authUserId, authUserRole);
  if ("notFound" in scope && scope.notFound) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Permission request not found" } },
      { status: 404 }
    );
  }
  if ("forbidden" in scope && scope.forbidden) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }
  const request = scope.request;

  // Only the owner student or admin/sysadmin may upload.
  const isOwner = request.student_user_id === authUserId;
  const isElevated = authUserRole === "admin" || authUserRole === "sysadmin";
  if (!isOwner && !isElevated) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  // Guard: exam/memo workflow, document required, still PENDING.
  const workflowOk =
    request.workflow_type === "exam" || request.workflow_type === "memo";
  if (!workflowOk || !request.document_required || request.status !== "PENDING") {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_NOT_ALLOWED", message: "Upload not allowed for this request" } },
      { status: 400 }
    );
  }

  // Parse multipart body.
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Expected multipart/form-data" } },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Missing file field" } },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_FILE_TYPE", message: "Only PDF files are allowed" } },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_TOO_LARGE", message: "File must be 10 MB or smaller" } },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ticketNumber = request.ticket_number as string;

  // Save (overwrite allowed — re-upload).
  await ensureTicketDir(ticketNumber);
  await fs.writeFile(documentPath(ticketNumber), bytes);

  const documentUrl = `/api/permissions/${encodeURIComponent(ticketNumber)}/document`;
  const history = appendStageHistory(
    request.stage_history,
    { id: authUserId, name: authUserEmail || "User", role: authUserRole },
    "document_uploaded",
    null
  );

  const { error: updateErr } = await getSupabaseServiceClient()
    .from("permission_requests")
    .update({
      document_url: documentUrl,
      stage_history: history,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (updateErr) {
    console.error("[Permission Upload] update error for ticket", ticketNumber, updateErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: updateErr.message } },
      { status: 500 }
    );
  }

  // Log ticket + byte length only — never file contents.
  console.log("[Permission Upload] saved document for ticket", ticketNumber, bytes.length, "bytes");

  addAudit({
    action: "PERMISSION_DOCUMENT_UPLOADED",
    userId: authUserId,
    userName: authUserEmail,
    role: authUserRole as Role,
    details: { ticketNumber, bytes: bytes.length },
  }).catch((err) => console.error("[Permission Upload] addAudit error:", err));

  addNotification(
    "user",
    request.student_user_id,
    "permission",
    "Document Uploaded for " + ticketNumber,
    "A document was uploaded to your permission request " + ticketNumber
  ).catch((err) => console.error("[Permission Upload] addNotification error:", err));

  return NextResponse.json({ success: true, data: { documentUrl } });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "permission_upload",
  maxRequests: 30,
});
