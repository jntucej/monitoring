// src/app/api/mess/my-token/route.ts
// GET /api/mess/my-token — the caller's pending/unused mess tokens.
// Includes both regular meal tokens (mess_tokens) AND special-event tokens
// (mess_event_tokens), which live in separate tables.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  // Regular meal tokens.
  const { rows: mealTokens } = await query(
    `SELECT t.id,
            t.token_code      AS token_code,
            t.qr_payload_hash AS qr_hash,
            t.primary_item    AS primary_item,
            t.sub_item_labels AS sub_item_labels,
            t.expires_at      AS expires_at,
            t.used_at         AS used_at,
            t.revoked_at      AS revoked_at,
            d.meal_date       AS meal_date,
            d.meal_type       AS meal_type,
            'meal'            AS kind
       FROM public.mess_tokens t
       JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE t.user_id = $1
        AND t.used_at IS NULL
        AND t.revoked_at IS NULL
        AND t.expires_at > NOW()
      ORDER BY t.created_at DESC
      LIMIT 5`,
    [auth.userId],
  );

  // Special-event tokens.
  const { rows: eventTokens } = await query(
    `SELECT e.id,
            NULL::text        AS token_code,
            e.item_labels     AS sub_item_labels,
            e.expires_at      AS expires_at,
            e.used_at         AS used_at,
            e.revoked_at      AS revoked_at,
            ev.event_date     AS meal_date,
            ev.meal_type      AS meal_type,
            'event'           AS kind,
            e.jti,
            ev.id             AS event_id,
            ev.title          AS event_title
       FROM public.mess_event_tokens e
       JOIN public.mess_special_events ev ON ev.id = e.event_id
      WHERE e.user_id = $1
        AND e.used_at IS NULL
        AND e.revoked_at IS NULL
        AND e.expires_at > NOW()
      ORDER BY e.issued_at DESC
      LIMIT 5`,
    [auth.userId],
  );

  return ok({
    mealTokens,
    eventTokens,
    tokens: [...mealTokens, ...eventTokens],
  });
}

export const GET = withAuthorization(handleGet);
