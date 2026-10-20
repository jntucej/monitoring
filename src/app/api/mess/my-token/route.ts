// src/app/api/mess/my-token/route.ts
// GET /api/mess/my-token — the caller's pending/unused mess meal tokens.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const { rows } = await query(
    `SELECT t.id,
            t.token_code     AS token_code,
            t.qr_payload_hash AS qr_hash,
            t.primary_item   AS primary_item,
            t.sub_item_labels AS sub_item_labels,
            t.expires_at     AS expires_at,
            t.used_at        AS used_at,
            t.revoked_at     AS revoked_at,
            d.meal_date      AS meal_date,
            d.meal_type      AS meal_type
       FROM public.mess_tokens t
       JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE t.user_id = $1
        AND t.used_at IS NULL
        AND t.revoked_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT 5`,
    [auth.userId],
  );

  return ok({ tokens: rows });
}

export const GET = withAuthorization(handleGet);
