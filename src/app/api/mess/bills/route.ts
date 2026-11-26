// /api/mess/bills/route.ts
// Per-student mess bills: issued tokens, consumption, rebates.
// mess_incharge verifies before month-end closure.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return fail("VALIDATION_ERROR", "month=YYYY-MM required", 400);
  }
  const { rows } = await query<{
    user_id: string; roll: string; name: string;
    tokens_issued: string; tokens_consumed: string;
  }>(
    `SELECT t.user_id, u.unique_id AS roll, u.name,
            COUNT(*) FILTER (WHERE t.revoked_at IS NULL)::text AS tokens_issued,
            COUNT(*) FILTER (WHERE t.used_at IS NOT NULL)::text AS tokens_consumed
       FROM public.mess_tokens t
       JOIN public.users u ON u.id = t.user_id
       JOIN public.mess_days d ON d.id = t.mess_day_id
      WHERE to_char(d.meal_date, 'YYYY-MM') = $1
      GROUP BY t.user_id, u.unique_id, u.name
      ORDER BY u.unique_id`,
    [month],
  );
  return ok({ month, students: rows.map((r) => ({
    userId: r.user_id, roll: r.roll, name: r.name,
    tokensIssued: Number(r.tokens_issued), tokensConsumed: Number(r.tokens_consumed),
  }))});
}

export const GET = withApiChain(implGet, {
  route: "/api/mess/bills",
  auth: "user",
  requiredRole: ["mess_incharge", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "mess-bills", maxRequests: 20, windowMs: 60_000 },
});
