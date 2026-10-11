import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { appendStageHistory, getScopedTicket } from "@/lib/permission-workflow";
import { addAudit, addNotification } from "@/lib/db";
import type { Role } from "@/lib/types";
import {
  documentPath,
  signedDocumentPath,
  readDocument,
  computeSignatureHash,
} from "@/lib/permission-document";

const MAX_NOTE = 200;

function getTicketParam(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] || "");
}

function badRequest(code: string, message: string, status = 400): Response {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function handlePost(req: NextRequest): Promise<Response> {
  const ticketParam = getTicketParam(req);
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";
  const authUserEmail = req.headers.get("x-user-email") || "";

  if (!ticketParam) return badRequest("BAD_REQUEST", "Ticket parameter required");

  // Authorization: principal and sysadmin only (break-glass).
  if (authUserRole !== "principal" && authUserRole !== "sysadmin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only the principal can sign" } },
      { status: 403 }
    );
  }

  const scope = await getScopedTicket(ticketParam, authUserId, authUserRole);
  if ("notFound" in scope && scope.notFound) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Permission request not found" } },
      { status: 404 }
    );
  }
  if (!("request" in scope)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }
  const request = scope.request;

  // Body (optional note).
  let signatureNote: string | null = null;
  try {
    const body = await req.json();
    const raw = typeof body?.signatureNote === "string" ? body.signatureNote.trim() : "";
    if (raw.length > MAX_NOTE) return badRequest("BAD_REQUEST", "signatureNote must be 200 characters or fewer");
    signatureNote = raw || null;
  } catch {
    signatureNote = null;
  }

  // Preconditions.
  const workflowOk = request.workflow_type === "exam" || request.workflow_type === "memo";
  if (!workflowOk) return badRequest("SIGN_NOT_ALLOWED", "Only exam/memo requests can be signed");
  if (request.status !== "PENDING") return badRequest("SIGN_NOT_ALLOWED", "Request is not pending");
  if (request.current_stage !== "principal") return badRequest("SIGN_NOT_ALLOWED", "Request is not at the principal stage");

  const ticketNumber = request.ticket_number as string;
  const original = await readDocument(ticketNumber);
  if (!original) return badRequest("NOT_FOUND", "No document uploaded yet.");

  const signedAt = new Date().toISOString();
  const signatureHash = computeSignatureHash(original, ticketNumber, authUserId, signedAt);

  // Copy original → signed copy on disk.
  await fs.copyFile(documentPath(ticketNumber), signedDocumentPath(ticketNumber));

  const { error: sigErr } = await getSupabaseServiceClient().from("document_signatures").insert({
    document_id: request.id,
    signed_by: authUserId,
    signed_at: signedAt,
    signature_hash: signatureHash,
  });
  if (sigErr) {
    console.error("[Permission Sign] signature insert error for ticket", ticketNumber, sigErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: sigErr.message } },
      { status: 500 }
    );
  }

  const history = appendStageHistory(
    request.stage_history,
    { id: authUserId, name: authUserEmail || "Principal", role: authUserRole },
    "signed",
    signatureNote,
    { from: request.current_stage, to: "completed" }
  );

  const { error: updateErr } = await getSupabaseServiceClient()
    .from("permission_requests")
    .update({
      digital_signature: signatureHash,
      current_stage: "completed",
      status: "COMPLETED",
      stage_history: history,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (updateErr) {
    console.error("[Permission Sign] update error for ticket", ticketNumber, updateErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: updateErr.message } },
      { status: 500 }
    );
  }

  console.log("[Permission Sign] signed ticket", ticketNumber, "by", authUserId);

  addAudit({
    action: "PERMISSION_DOCUMENT_SIGNED",
    userId: authUserId,
    userName: authUserEmail,
    role: authUserRole as Role,
    details: { ticketNumber, signature_hash: signatureHash },
  }).catch((err) => console.error("[Permission Sign] addAudit error:", err));

  addNotification(
    "user",
    request.student_user_id,
    "permission",
    "Document Signed for " + ticketNumber,
    "Your permission request " + ticketNumber + " has been digitally signed and completed"
  ).catch((err) => console.error("[Permission Sign] addNotification error:", err));

  return NextResponse.json({ success: true, data: { signatureHash, signedAt } });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "permission_sign",
  maxRequests: 30,
});
