/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";

const UPLOADS_ROOT = process.env.DOCUMENT_UPLOADS_ROOT || "/var/lib/gate-monitor/uploads";
const MAX_BYTES = 5 * 1024 * 1024;

function ticketFrom(req: NextRequest) {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segs[segs.length - 2] || "");
}

async function handlePost(req: NextRequest, ctx: { auth: any }) {
  const ticket = ticketFrom(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "file field required" } }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: { code: "TOO_LARGE", message: "Max 5MB" } }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data: request } = await supabase
    .from("permission_requests").select("*").eq("ticket_number", ticket).single();
  if (!request) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Ticket not found" } }, { status: 404 });

  if (request.student_user_id !== ctx.auth.userId) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Only the requester may upload" } }, { status: 403 });
  }

  const dir = join(UPLOADS_ROOT, ticket);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.pdf`;
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const relativeUrl = `${ticket}/${filename}`;
  await supabase.from("permission_requests").update({ document_url: relativeUrl }).eq("id", request.id);

  await addAudit({
    action: "PERMISSION_DOCUMENT_UPLOADED",
    userId: ctx.auth.userId,
    details: { ticketNumber: ticket, size: file.size },
  });

  return NextResponse.json({ success: true, data: { documentUrl: relativeUrl } });
}

export const POST = withRateLimit(withAuthorization(handlePost), { keyPrefix: "doc_upload", maxRequests: 20 });
