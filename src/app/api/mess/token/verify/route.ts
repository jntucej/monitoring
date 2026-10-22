// src/app/api/mess/token/verify/route.ts
// GET ?code=... — pre-verify a mess meal token without consuming it.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!code) return fail("VALIDATION_ERROR", "code required", 400);

  const { rows } = await query<{
    token_code: string;
    used_at: string | null;
    revoked_at: string | null;
    expires_at: string;
    name: string;
    unique_id: string;
    primary_item: string;
    sub_item_labels: string[];
    meal_date: string;
    meal_type: string;
  }>(
    `SELECT t.token_code, t.used_at, t.revoked_at, t.expires_at,
            u.name, u.unique_id, t.primary_item, t.sub_item_labels,
            d.meal_date, d.meal_type
       FROM public.mess_tokens t
       JOIN public.users u ON u.id = t.user_id
       JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE t.token_code = $1
      LIMIT 1`,
    [code],
  );
  const t = rows[0];
  if (!t) return fail("TOKEN_NOT_FOUND", "Invalid token", 404);

  const valid =
    !t.used_at && !t.revoked_at && new Date(t.expires_at).getTime() > Date.now();

  return ok({
    valid,
    tokenCode: t.token_code,
    student: { name: t.name, roll: t.unique_id },
    meal: { date: t.meal_date, type: t.meal_type },
    primaryItem: t.primary_item,
    subItems: t.sub_item_labels,
    expiresAt: t.expires_at,
    usedAt: t.used_at,
    revokedAt: t.revoked_at,
  });
}

export const GET = withAuthorization(handleGet);
