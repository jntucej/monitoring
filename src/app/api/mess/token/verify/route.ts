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
    revoked_by: string | null;
    expires_at: string;
    name: string;
    unique_id: string;
    primary_item: string;
    sub_item_labels: string[];
    meal_date: string;
    meal_type: string;
    user_id: string;
    mess_day_id: string;
  }>(
    `SELECT t.token_code, t.used_at, t.revoked_at,
            t.revoked_by::text AS revoked_by,
            t.expires_at, u.name, u.unique_id, t.primary_item, t.sub_item_labels,
            d.meal_date, d.meal_type, t.user_id::text AS user_id, t.mess_day_id::text AS mess_day_id
       FROM public.mess_tokens t
       JOIN public.users u ON u.id = t.user_id
       JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE t.token_code = $1
      LIMIT 1`,
    [code],
  );
  const t = rows[0];
  if (!t) {
    // No token for this code. If the in-charge passes a student's roll as the
    // "code", surface the eligibility reason (PR5) instead of a bare 404.
    const { rows: eligRows } = await query<{ reason: string; explanation: string | null }>(
      `SELECT reason, explanation
         FROM public.mess_eligibility
        WHERE user_id::text = $1 AND eligible = FALSE
        ORDER BY decided_at DESC LIMIT 1`,
      [code],
    );
    if (eligRows[0]) {
      return ok({
        valid: false,
        reason: "NO_TOKEN",
        eligibility: {
          reason: eligRows[0].reason,
          explanation: eligRows[0].explanation ?? "Not eligible for this meal.",
        },
      });
    }
    return fail("TOKEN_NOT_FOUND", "Invalid token", 404);
  }

  // Who revoked it + why (PR5: the counter can decide on an override).
  let revokeActor: { name: string | null } | null = null;
  if (t.revoked_at) {
    const { rows: rev } = await query<{ name: string | null }>(
      `SELECT name FROM public.users WHERE id::text = $1 LIMIT 1`,
      [t.revoked_by ?? ""],
    );
    revokeActor = { name: rev[0]?.name ?? "unknown" };
  }

  const valid =
    !t.used_at && !t.revoked_at && new Date(t.expires_at).getTime() > Date.now();

  return ok({
    valid,
    tokenCode: t.token_code,
    student: { name: t.name, roll: t.unique_id, userId: t.user_id },
    meal: { date: t.meal_date, type: t.meal_type },
    primaryItem: t.primary_item,
    subItems: t.sub_item_labels,
    expiresAt: t.expires_at,
    usedAt: t.used_at,
    revokedAt: t.revoked_at,
    revokeActor,
  });
}

export const GET = withAuthorization(handleGet);
