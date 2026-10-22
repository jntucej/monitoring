// src/app/api/mess/events/[id]/token/[tokenId]/regenerate-code/route.ts
// POST — M15: reissue the manual code for a student's event token when they
// lost it. The student (or mess staff on their behalf) gets a fresh code; the
// old code stops working immediately because the stored hash is replaced.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { regenerateManualCode } from "@/lib/mess-event-token";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "hostel_manager", "admin", "sysadmin"]);

function getIds(req: NextRequest): { eventId: string; tokenId: string } {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return { tokenId: s[s.length - 1] ?? "", eventId: s[s.length - 2] ?? "" };
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { tokenId } = getIds(req);
  if (!tokenId) return fail("VALIDATION_ERROR", "tokenId required", 400);

  // Ownership check: the student must own the token, or the caller must be staff.
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM public.mess_event_tokens WHERE id = $1::uuid LIMIT 1`,
    [tokenId],
  );
  const token = rows[0];
  if (!token) return fail("NOT_FOUND", "Token not found", 404);
  if (token.user_id !== auth.userId && !STAFF.has(auth.role)) {
    return fail("FORBIDDEN", "Not your token", 403);
  }

  const result = await regenerateManualCode(tokenId, auth.userId);
  if (!result.ok) return fail("NOT_REGENERABLE", result.error, 409);

  await addAudit({
    action: "MESS_EVENT_TOKEN_MANUAL_CODE_REGEN",
    userId: auth.userId,
    role: auth.role,
    details: { tokenId, eventId: getIds(req).eventId },
  });

  // Shown once — the caller stores/displays it; we never persist the plaintext.
  return ok({ tokenId, manualCode: result.manualCode });
}

export const POST = withAuthorization(handlePost);
