// src/app/api/mess/events/[id]/token/[tokenId]/unlock/route.ts
// POST — mess-incharge unlocks a locked event token (M13) and resets its
// failed-attempt counter.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "admin", "sysadmin"]);

function getIds(req: NextRequest): { tokenId: string } {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return { tokenId: s[s.length - 1] ?? "" };
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const { tokenId } = getIds(req);
  if (!tokenId) return fail("VALIDATION_ERROR", "tokenId required", 400);

  const { rows } = await query<{ id: string }>(
    `UPDATE public.mess_event_tokens
        SET failed_attempts = 0, locked_until = NULL
      WHERE id = $1::uuid
        AND revoked_at IS NULL
        AND used_at IS NULL
      RETURNING id`,
    [tokenId],
  );
  if (!rows[0]) {
    return fail("NOT_UNLOCKABLE", "Token not found or already used/revoked", 409);
  }

  await addAudit({
    action: "MESS_EVENT_TOKEN_UNLOCKED",
    userId: auth.userId,
    role: auth.role,
    details: { tokenId },
  });

  return ok({ unlocked: true, tokenId });
}

export const POST = withAuthorization(handlePost);
