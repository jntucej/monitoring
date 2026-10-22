// src/app/api/mess/tokens/[id]/route.ts
// GET — single mess meal token by id (owner or mess staff).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "hostel_manager", "admin", "sysadmin", "operator"]);

function getId(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 1] ?? "";
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "id required", 400);

  const { rows } = await query(
    `SELECT t.*, u.name, u.unique_id AS unique_id,
            d.meal_date AS meal_date, d.meal_type AS meal_type
       FROM public.mess_tokens t
       JOIN public.users u ON u.id = t.user_id
       JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE t.id = $1::uuid
      LIMIT 1`,
    [id],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Not found", 404);

  const isOwner = rows[0].user_id === auth.userId;
  if (!isOwner && !STAFF.has(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  return ok({ token: rows[0] });
}

export const GET = withAuthorization(handleGet);
