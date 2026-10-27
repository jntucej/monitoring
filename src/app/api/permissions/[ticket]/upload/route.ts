import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { appendStageHistory, getScopedTicket } from "@/lib/permission-workflow";
import { addAudit, addNotification } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import type { Role } from "@/lib/types";
import {
  ensureTicketDir,
  documentPath,
} from "@/lib/permission-document";

function getTicketParam(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("permissions");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handlePost(req: NextRequest): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicketParam(req);
  if (!ticket) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_TICKET", message: "ticket required" } },
      { status: 400 },
    );
  }

  const scoped = await getScopedTicket(ticket, "", "");
  if ("notFound" in scoped) {
    return NextResponse.json(
      { success: false, error: { code: "TICKET_NOT_FOUND", message: "Ticket not found" } },
      { status: 404 },
    );
  }
  if ("forbidden" in scoped) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not allowed" } },
      { status: 403 },
    );
  }

  const row = scoped.request;
  if (row.document_url) {
    return NextResponse.json(
      { success: false, error: { code: "DOCUMENT_EXISTS", message: "Document already uploaded" } },
      { status: 409 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_FILE", message: "file required" } },
      { status: 400 },
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_TOO_LARGE", message: "Max 10 MB" } },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowed.includes(mime)) {
    return NextResponse.json(
      { success: false, error: { code: "UNSUPPORTED_MIME", message: "PDF, PNG, JPG only" } },
      { status: 415 },
    );
  }

  const dir = await ensureTicketDir(ticket);
  const dest = documentPath(ticket);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buf);

  const supabase = getSupabaseServiceClient();
  const { error: updErr } = await supabase
    .from("permissions")
    .update({
      document_url: `/api/permissions/${ticket}/document`,
      stage_history: appendStageHistory(
        (row as any).stage_history,
        { id: "system", name: "upload", role: "system" },
        "DOCUMENT_UPLOADED",
        `mime=${mime} size=${buf.length}`,
      ),
    })
    .eq("id", row.id);

  if (updErr) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: updErr.message } },
      { status: 500 },
    );
  }

  await addAudit({
    action: "PERMISSION_DOCUMENT_UPLOADED",
    userId: row.id,
    details: JSON.stringify({ ticket, size: buf.length, mime, dir }),
  });

  await addNotification(
    "user",
    (row as any).student_user_id ?? (row as any).requester_user_id,
    "permission",
    "Document Uploaded",
    `Document attached to ticket ${ticket}`,
  );

  return NextResponse.json({
    success: true,
    data: { ticket, size: buf.length, mime },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 10,
});
