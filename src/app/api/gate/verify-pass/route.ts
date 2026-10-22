// src/app/api/gate/verify-pass/route.ts
// GET  /api/gate/verify-pass?roll=...&reason=... — pre-scan pass check for a roll.
// POST /api/gate/verify-pass { token }           — verify a signed QR pass token.
// Both query the modern permissions table first and fall back to legacy
// gate_passes, so gate UIs can show "approved / no pass / expired" before scan.

import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { requireSecret } from "@/lib/env";
import type { AuthContext } from "@/lib/authContext";

const GATE_ROLES = [
  "operator",
  "supervisor",
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
];

interface PassRow {
  id: string;
  ticket_number: string;
  status: string;
  from_date: string | null;
  to_date: string | null;
  used_at: string | null;
  reason: string | null;
}

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  const url = new URL(req.url);
  const roll = (url.searchParams.get("roll") ?? "").trim().toUpperCase();
  const reason = (url.searchParams.get("reason") ?? "").trim();
  if (!roll || !reason) {
    return fail("VALIDATION_ERROR", "roll and reason are required", 400);
  }

  const { rows: users } = await query<{ id: string; status: string }>(
    `SELECT id, status FROM public.users WHERE UPPER(unique_id) = $1 LIMIT 1`,
    [roll],
  );
  const user = users[0];
  if (!user) return fail("PERSON_NOT_FOUND", "Unknown roll", 404);
  if (user.status !== "ACTIVE") return fail("ACCOUNT_NOT_ACTIVE", `Account is ${user.status}`, 403);

  const { rows } = await query<PassRow>(
    `SELECT id, ticket_number, status, from_date, to_date, used_at, reason
       FROM public.permissions
      WHERE requester_user_id = $1
        AND workflow_type = 'hostel'
        AND reason = $2
        AND status = 'APPROVED'
        AND used_at IS NULL
        AND from_date <= NOW()
        AND to_date   >= NOW()
      ORDER BY created_at DESC
      LIMIT 1`,
    [user.id, reason],
  );
  if (!rows[0]) {
    // Fall back to legacy gate_passes.
    const { rows: legacy } = await query<{
      id: string;
      reason: string;
      from_datetime: string;
      to_datetime: string;
    }>(
      `SELECT id, reason, from_datetime, to_datetime
         FROM public.gate_passes
        WHERE user_id = $1
          AND final_status IN ('APPROVED','APPROVED_PARENT','APPROVED_ADMIN')
          AND from_datetime <= NOW()
          AND to_datetime   >= NOW()
        ORDER BY requested_at DESC
        LIMIT 1`,
      [user.id],
    );
    if (!legacy[0]) return fail("NO_APPROVED_PASS", "No active approved pass", 404);
    return ok({
      source: "legacy",
      pass: {
        id: legacy[0].id,
        from: legacy[0].from_datetime,
        to: legacy[0].to_datetime,
        reason: legacy[0].reason,
      },
    });
  }

  return ok({
    source: "modern",
    pass: {
      id: rows[0].id,
      ticketNumber: rows[0].ticket_number,
      from: rows[0].from_date,
      to: rows[0].to_date,
      reason: rows[0].reason,
    },
  });
}

function verifySignature(payload: string, sig: string): boolean {
  const expected = createHmac("sha256", requireSecret("QR_TOKEN_SECRET", 16))
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handlePost(req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return fail("VALIDATION_ERROR", "token required", 400);

  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return fail("INVALID_TOKEN", "Malformed token", 400);

  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return fail("INVALID_TOKEN", "Bad token", 400);
  }
  if (!verifySignature(payload, sig)) {
    return fail("INVALID_TOKEN", "Signature mismatch", 401);
  }

  let claim: { v: number; jti: string; sub: string; tkt: string; exp: number };
  try {
    claim = JSON.parse(payload);
  } catch {
    return fail("INVALID_TOKEN", "Bad payload", 400);
  }
  if (typeof claim.exp !== "number" || claim.exp * 1000 < Date.now()) {
    return fail("TOKEN_EXPIRED", "Token expired", 410);
  }

  const { rows } = await query<{
    id: string;
    status: string;
    used_at: string | null;
    from_date: string;
    to_date: string;
  }>(
    `SELECT id, status, used_at, from_date, to_date
       FROM public.permissions
      WHERE ticket_number = $1
      LIMIT 1`,
    [claim.tkt],
  );
  const row = rows[0];
  if (!row) return fail("TICKET_NOT_FOUND", "Ticket not found", 404);
  if (row.status !== "APPROVED") {
    return fail("PASS_NOT_USABLE", `Pass is ${row.status}`, 409);
  }
  if (row.used_at) return fail("PASS_ALREADY_USED", `Pass used at ${row.used_at}`, 409);
  if (new Date(row.from_date).getTime() > Date.now()) {
    return fail("PASS_NOT_YET_VALID", "Pass window has not opened", 409);
  }
  if (new Date(row.to_date).getTime() < Date.now()) {
    return fail("PASS_EXPIRED", "Pass window has closed", 409);
  }

  return ok({ valid: true, ticket: claim.tkt, studentUserId: claim.sub });
}

const gateLimit = { windowMs: 60_000, maxRequests: 120 };

export const GET = withRateLimit(withAuthorization(handleGet), gateLimit);
export const POST = withRateLimit(withAuthorization(handlePost), gateLimit);
