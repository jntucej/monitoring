// src/app/api/mess/token/[code]/regenerate/route.ts
// POST — re-emit the QR payload for an owned, valid, unused token.
// (The token_code IS the QR payload; this just re-renders it so a student who
// lost the on-screen QR can get it back.)

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
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

  const { rows } = await query<{
    id: string;
    user_id: string;
    expires_at: string;
    used_at: string | null;
    revoked_at: string | null;
  }>(
    `SELECT id, user_id, expires_at, used_at, revoked_at
       FROM public.mess_tokens WHERE token_code = $1 LIMIT 1`,
    [code],
  );
  const t = rows[0];
  if (!t || t.user_id !== auth.userId) return fail("FORBIDDEN", "Not your token", 403);
  if (t.used_at) return fail("TOKEN_USED", "Cannot regenerate a used token", 409);
  if (t.revoked_at) return fail("TOKEN_REVOKED", "Token revoked", 409);
  if (new Date(t.expires_at).getTime() <= Date.now()) {
    return fail("TOKEN_EXPIRED", "Window closed", 410);
  }

  return ok({ tokenCode: code, expiresAt: t.expires_at, qrText: `mycampus:mess:${code}` });
}

export const POST = withAuthorization(handlePost);
