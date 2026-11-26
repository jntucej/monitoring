// /api/mess/tokens/anomaly/route.ts
// Issuance velocity check: more tokens than enrolled boarders in a
// rolling 15-minute window → flag before service begins (STEP 3.5).

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const windowMin = Number(req.nextUrl.searchParams.get("windowMinutes") ?? 15);
  const { rows } = await query<{ issued: string; boarders: string }>(
    `SELECT (SELECT COUNT(*) FROM public.mess_tokens t
              JOIN public.mess_days d ON d.id = t.mess_day_id
             WHERE t.created_at > now() - ($1 || ' minutes')::interval
               AND t.revoked_at IS NULL)::text AS issued,
            (SELECT COUNT(DISTINCT t.user_id) FROM public.mess_tokens t
              JOIN public.mess_days d ON d.id = t.mess_day_id
             WHERE t.created_at > now() - ($1 || ' minutes')::interval
               AND t.revoked_at IS NULL)::text AS boarders`,
    [String(windowMin)],
  );
  const issued = Number(rows[0]?.issued ?? 0);
  const boarders = Number(rows[0]?.boarders ?? 0);
  const anomaly = issued > 0 && boarders > 0 && issued > boarders;
  return ok({ windowMinutes: windowMin, issued, distinctBoarders: boarders, anomaly,
              message: anomaly
                ? `ANOMALY: ${issued} tokens issued in ${windowMin}m exceeds ${boarders} distinct boarders`
                : "OK" });
}

export const GET = withApiChain(implGet, {
  route: "/api/mess/tokens/anomaly",
  auth: "user",
  requiredRole: ["mess_incharge", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "mess-tokens-anomaly", maxRequests: 30, windowMs: 60_000 },
});
