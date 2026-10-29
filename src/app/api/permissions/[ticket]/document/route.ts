import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getScopedTicket } from "@/lib/permission-workflow";
import {
  readDocument,
  readSignedDocument,
} from "@/lib/permission-document";

function getTicketParam(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] || "");
}

async function handleGet(req: NextRequest): Promise<Response> {
  const ticketParam = getTicketParam(req);
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";

  if (!ticketParam) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Ticket parameter required" } },
      { status: 400 }
    );
  }

  // Same visibility scoping as GET /api/permissions/[ticket] (Step 2).
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
  const ticketNumber = request.ticket_number as string;

  // Prefer the signed version when present; fall back to the uploaded original.
  const signed = await readSignedDocument(ticketNumber);
  const bytes = signed ?? (await readDocument(ticketNumber));

  if (!bytes) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "No document uploaded yet." } },
      { status: 404 }
    );
  }

  // Do NOT log file bytes.
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ticketNumber}.pdf"`,
      "Content-Length": String(bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "permission_document_get",
  maxRequests: 100,
});
