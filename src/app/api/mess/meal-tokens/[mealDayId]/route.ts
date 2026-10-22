// src/app/api/mess/meal-tokens/[mealDayId]/route.ts
// GET — mess-incharge lists every token for a meal day (M16).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "admin", "sysadmin"]);

function getMealDayId(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 1] ?? "";
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);

  const mealDayId = getMealDayId(req);
  if (!mealDayId) return fail("VALIDATION_ERROR", "mealDayId required", 400);

  const { rows } = await query(
    `SELECT t.id,
            t.token_code      AS token_code,
            t.primary_item    AS primary_item,
            t.sub_item_labels AS sub_item_labels,
            t.used_at         AS used_at,
            t.revoked_at      AS revoked_at,
            u.name,
            u.unique_id       AS unique_id
       FROM public.mess_tokens t
       JOIN public.users u ON u.id = t.user_id
      WHERE t.mess_day_id = $1::uuid
      ORDER BY u.name`,
    [mealDayId],
  );

  return ok({ mealDayId, tokens: rows, total: rows.length });
}

export const GET = withAuthorization(handleGet);
