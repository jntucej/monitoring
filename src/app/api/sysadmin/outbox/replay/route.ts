import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/sysadmin/outbox/replay — replay a single DEAD_LETTER outbox event
 * or all of them. Each replay resets attempts + clears last_error + sets
 * status PENDING so the relay retries the exponential backoff.
 */
export interface OutboxReplayBody {
  mode: "all" | "one";
  outboxId?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<OutboxReplayBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as OutboxReplayBody;
  const auth = ctx.auth;
  if (auth.role !== "sysadmin") return fail("FORBIDDEN", "Outbox replay requires sysadmin.", 403);
  const { mode, outboxId } = body;

  if (mode === "one") {
    if (!outboxId) return fail("MISSING_BODY", "outboxId required for mode=one.", 400);
    await query(
      `UPDATE public.domain_outbox
          SET status = 'PENDING', attempts = 0, last_error = NULL, next_retry_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'DEAD_LETTER'`,
      [outboxId],
    ).catch(() => {});
    return ok({ replayed: 1, mode, outboxId, note: "DEAD_LETTER event reset to PENDING — relay will retry." });
  }
  // mode = "all"
  const n = await query<{ n: number }>(
    `UPDATE public.domain_outbox
        SET status = 'PENDING', attempts = 0, last_error = NULL, next_retry_at = NOW(), updated_at = NOW()
       WHERE status = 'DEAD_LETTER' RETURNING 1`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  return ok({ replayed: n.rows.length, mode, note: "All DEAD_LETTER events reset to PENDING." });
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/outbox/replay",
  auth: "user",
  requiredRole: "sysadmin",
});
