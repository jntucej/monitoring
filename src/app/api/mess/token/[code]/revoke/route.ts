// src/app/api/mess/token/[code]/revoke/route.ts
// POST — a student self-revokes their own unused mess token.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getCode(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 2] ?? "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const code = getCode(req);
  if (!code) return fail("VALIDATION_ERROR", "code required", 400);

  const { rows } = await query<{ id: string; user_id: string; used_at: string | null }>(
    `UPDATE public.mess_tokens
        SET revoked_at = NOW(), revoked_by = $2::uuid
      WHERE token_code = $1
        AND user_id = $2
        AND used_at IS NULL
        AND revoked_at IS NULL
      RETURNING id, user_id, used_at`,
    [code, auth.userId],
  );
  if (!rows[0]) {
    return fail("NOT_REVOCABLE", "Token not found, not yours, or already used", 409);
  }

  await addAudit({
    action: "MESS_TOKEN_REVOKED",
    userId: auth.userId,
    role: auth.role,
    details: { tokenCode: code, self: true },
  });

  return ok({ revoked: true });
}

export const POST = withAuthorization(handlePost);
