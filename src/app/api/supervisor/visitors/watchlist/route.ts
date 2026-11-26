// /api/supervisor/visitors/watchlist/route.ts
// Supervisor-managed ban list. Check-in of a watchlisted visitor is
// auto-blocked by the gate verify path (see /api/gate/verify-*).

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query<{
    user_id: string; name: string; unique_id: string | null;
    reason: string | null; added_at: string;
  }>(
    `SELECT w.user_id, u.name, u.unique_id, w.reason, w.added_at
       FROM public.visitor_watchlist w
       JOIN public.users u ON u.id = w.user_id
      WHERE w.active = TRUE
      ORDER BY w.added_at DESC`,
  );
  return ok({ watchlist: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    remove?: boolean;
    reason?: string;
  } | null;
  if (!body?.userId) return fail("VALIDATION_ERROR", "userId required", 400);

  if (body.remove) {
    await query(
      `UPDATE public.visitor_watchlist SET active = FALSE WHERE user_id = $1 AND active = TRUE`,
      [body.userId],
    );
    await recordMutationAudit({
      actorId: auth.userId, roleContext: auth.role, action: "watchlist_remove",
      resource: "visitor_watchlist", resourceId: body.userId,
    });
    return ok({ removed: body.userId });
  }

  const { rows } = await query(
    `INSERT INTO public.visitor_watchlist (user_id, reason, added_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET active = TRUE, reason = EXCLUDED.reason
     RETURNING user_id`,
    [body.userId, body.reason?.trim() || null, auth.userId],
  );
  if (rows.length === 0) return fail("NOT_FOUND", "Visitor user not found", 404);
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "watchlist_add",
    resource: "visitor_watchlist", resourceId: body.userId,
    afterState: { reason: body.reason ?? null },
  });
  return ok({ added: body.userId });
}

export const GET = withApiChain(implGet, {
  route: "/api/supervisor/visitors/watchlist",
  auth: "user",
  requiredRole: ["supervisor", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "watchlist-get", maxRequests: 20, windowMs: 60_000 },
});

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["supervisor", "admin", "sysadmin"] }),
  { keyPrefix: "watchlist-post", maxRequests: 10, windowMs: 60_000 },
);
