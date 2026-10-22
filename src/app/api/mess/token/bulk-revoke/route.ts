// src/app/api/mess/token/bulk-revoke/route.ts
// POST { messDayId, reason } — mess-incharge revokes every unused token for a meal day.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "admin", "sysadmin"]);

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const { messDayId, reason } = (await req.json().catch(() => ({}))) as {
    messDayId?: string;
    reason?: string;
  };
  if (!messDayId) return fail("VALIDATION_ERROR", "messDayId required", 400);

  const { rowCount } = await query(
    `UPDATE public.mess_tokens
        SET revoked_at = NOW(), revoked_by = $1::uuid
      WHERE mess_day_id = $2::uuid
        AND used_at IS NULL
        AND revoked_at IS NULL`,
    [auth.userId, messDayId],
  );

  await addAudit({
    action: "MESS_TOKENS_REVOKED",
    userId: auth.userId,
    role: auth.role,
    details: { messDayId, count: rowCount ?? 0, reason: reason ?? null },
  });

  return ok({ revoked: rowCount ?? 0 });
}

export const POST = withAuthorization(handlePost);
