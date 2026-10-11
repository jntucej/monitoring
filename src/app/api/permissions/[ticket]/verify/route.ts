/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { computeSignatureHash, fetchDocumentBytes } from "@/lib/document-signature";

function getTicketParam(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const permIdx = segs.indexOf("permissions");
  if (permIdx !== -1 && segs.length > permIdx + 1) {
    return decodeURIComponent(segs[permIdx + 1]);
  }
  return "";
}

async function handleGet(req: NextRequest, _ctx?: { auth?: any }): Promise<Response> {
  const ticket = getTicketParam(req);
  if (!ticket) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Ticket parameter required" } },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket);
  let q = supabase.from("permission_requests").select("*");
  if (isUuid) {
    q = q.or(`id.eq.${ticket},ticket_number.eq.${ticket}`);
  } else {
    q = q.eq("ticket_number", ticket);
  }

  const { data: request, error } = await q.single();
  if (error || !request) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Permission request not found" } },
      { status: 404 }
    );
  }

  if (!request.document_url) {
    return NextResponse.json({
      success: true,
      data: { verified: false, reason: "no_document" },
    });
  }

  const { data: sig } = await supabase
    .from("document_signatures")
    .select("*")
    .eq("document_id", request.id)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sig) {
    return NextResponse.json({
      success: true,
      data: { verified: false, reason: "unsigned" },
    });
  }

  try {
    const bytes = await fetchDocumentBytes(request.document_url);
    const recomputed = await computeSignatureHash({
      documentBytes: bytes,
      ticketNumber: request.ticket_number,
      signerId: sig.signed_by,
      timestampMs: new Date(sig.signed_at).getTime(),
    });

    return NextResponse.json({
      success: true,
      data: {
        verified: recomputed === sig.signature_hash,
        expected: sig.signature_hash,
        computed: recomputed,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "VERIFY_ERROR", message: err?.message || "Failed to verify signature" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet);
