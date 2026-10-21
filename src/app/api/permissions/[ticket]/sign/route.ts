import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { appendStageHistory, getScopedTicket } from "@/lib/permission-workflow";
import { addAudit, addNotification } from "@/lib/db";
import type { Role } from "@/lib/types";
import {
  documentPath,
  signedDocumentPath,
  readDocument,
  computeSignatureHash,
} from "@/lib/permission-document";

function getTicketParam(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("permissions");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

function badRequest(code: string, message: string, status = 400): Response {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function handlePost(req: NextRequest): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicketParam(req);
  const body = await req.json().catch(() => ({}));
  const signerUserId = body.signerUserId as string | undefined;

  if (!signerUserId) return badRequest("MISSING_SIGNER", "signerUserId required");

  const scoped = await getScopedTicket(ticket, "", "");
  if ("notFound" in scoped) return badRequest("TICKET_NOT_FOUND", "Ticket not found", 404);
  if ("forbidden" in scoped) return badRequest("FORBIDDEN", "Not allowed", 403);

  const row = scoped.request;
  if (row.digital_signature) {
    return badRequest("ALREADY_SIGNED", "Ticket is already signed", 409);
  }

  const docBytes = await readDocument(ticket);
  if (!docBytes) return badRequest("DOCUMENT_MISSING", "Upload document first", 400);

  const signedAt = new Date().toISOString();
  const sigHash = computeSignatureHash(docBytes, ticket, signerUserId, signedAt);

  const dest = signedDocumentPath(ticket);
  await fs.writeFile(dest, docBytes);

  const supabase = getSupabaseServiceClient();
  const { error: updErr } = await supabase
    .from("permissions")
    .update({
      digital_signature: sigHash,
      stage_history: appendStageHistory(
        (row as any).stage_history,
        { id: signerUserId, name: "signer", role: "signer" },
        "DOCUMENT_SIGNED",
        `hash=${sigHash.slice(0, 16)}…`,
      ),
    })
    .eq("id", row.id);

  if (updErr) {
    return badRequest("DB_ERROR", updErr.message, 500);
  }

  await addAudit({
    action: "PERMISSION_DOCUMENT_SIGNED",
    userId: signerUserId,
    details: JSON.stringify({ ticket, hash: sigHash }),
  });

  await addNotification(
    "user",
    (row as any).student_user_id ?? (row as any).requester_user_id,
    "permission",
    "Document Signed",
    `Ticket ${ticket} has been digitally signed`,
  );

  return NextResponse.json({
    success: true,
    data: { ticket, signatureHash: sigHash, signedAt },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 20,
});
