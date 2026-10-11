/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { computeSignatureHash, fetchDocumentBytes } from "@/lib/document-signature";

async function handleGet(req: NextRequest, _ctx: { auth: any }) {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  const ticket = decodeURIComponent(segs[segs.length - 3] || "");
  const supabase = getSupabaseServiceClient();

  const { data: request } = await supabase
    .from("permission_requests").select("*").eq("ticket_number", ticket).single();
  if (!request || !request.document_url) {
    return NextResponse.json({ success: true, data: { verified: false, reason: "no_document" } });
  }

  const { data: sig } = await supabase
    .from("document_signatures")
    .select("*").eq("document_id", request.id).order("signed_at", { ascending: false }).limit(1).maybeSingle();
  if (!sig) return NextResponse.json({ success: true, data: { verified: false, reason: "unsigned" } });

  const bytes = await fetchDocumentBytes(request.document_url);
  const recomputed = await computeSignatureHash({
    documentBytes: bytes,
    ticketNumber: request.ticket_number,
    signerId: sig.signed_by,
    timestampMs: new Date(sig.signed_at).getTime(),
  });

  return NextResponse.json({
    success: true,
    data: { verified: recomputed === sig.signature_hash, expected: sig.signature_hash, computed: recomputed },
  });
}

export const GET = withAuthorization(handleGet);
