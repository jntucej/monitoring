// src/app/api/permissions/[ticket]/qr/route.ts
// GET /api/permissions/[ticket]/qr — issue a short-lived signed QR token for an
// APPROVED, unused, in-window pass. Owners and approvers only.

import { NextRequest } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { requireSecret } from "@/lib/env";
import type { AuthContext } from "@/lib/authContext";

const GATE_ROLES = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
  "operator",
  "supervisor",
];

function getTicket(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

function signPayload(payload: string): string {
  return createHmac("sha256", requireSecret("QR_TOKEN_SECRET", 16))
    .update(payload)
    .digest("base64url");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const ticket = getTicket(req);
  if (!ticket) return fail("VALIDATION_ERROR", "ticket required", 400);

  const { rows } = await query<{
    id: string;
    ticket_number: string;
    status: string;
    requester_user_id: string | null;
    student_user_id: string;
    from_date: string | null;
    to_date: string | null;
    used_at: string | null;
  }>(
    `SELECT id, ticket_number, status, requester_user_id, student_user_id,
            from_date, to_date, used_at
       FROM public.permissions
      WHERE ticket_number = $1
      LIMIT 1`,
    [ticket],
  );
  const row = rows[0];
  if (!row) return fail("TICKET_NOT_FOUND", "Ticket not found", 404);

  const isOwner =
    row.requester_user_id === auth.userId || row.student_user_id === auth.userId;
  const isApprover = GATE_ROLES.includes(auth.role);
  if (!isOwner && !isApprover) return fail("FORBIDDEN", "Not allowed", 403);

  if (row.status !== "APPROVED" || row.used_at) {
    return fail("PASS_NOT_USABLE", "QR is only valid for an APPROVED, unused pass", 409);
  }

  const now = Date.now();
  const from = row.from_date ? new Date(row.from_date).getTime() : 0;
  const to = row.to_date ? new Date(row.to_date).getTime() : 0;
  if (from && now < from) return fail("PASS_NOT_YET_VALID", "Pass window has not opened", 409);
  if (to && now > to) return fail("PASS_EXPIRED", "Pass window has closed", 409);

  const jti = randomBytes(9).toString("base64url");
  const payload = JSON.stringify({
    v: 1,
    jti,
    sub: row.student_user_id,
    tkt: row.ticket_number,
    exp: Math.floor(now / 1000) + 900,
  });
  const token = Buffer.from(payload).toString("base64url") + "." + signPayload(payload);

  return ok({
    ticket: row.ticket_number,
    token,
    expiresIn: 900,
    qrText: `mycampus:pass:${token}`,
  });
}

export const GET = withAuthorization(handleGet);
