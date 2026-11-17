// /api/sysadmin/bot/anomaly/route.ts
// Telegram bot session anomaly auto-suspension (STEP 3.9 /
// AUTONOMOUS_OPERATIONS 4.4): anomalous command velocity or failed
// /verify bursts suspend the bot session and force portal WebAuthn
// re-auth. The bot guard agent (Phase 1) calls this; sysadmin can
// also trigger manually. Suspension state is kept in the gate-side
// telegram_session_suspensions ledger; the webhook checks it before
// any /verify or mutation.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    chatId?: string;
    reason?: string;
  } | null;
  if (!body?.chatId) return fail("VALIDATION_ERROR", "chatId required", 400);

  const { rows } = await query(
    `INSERT INTO public.telegram_session_suspensions (chat_id, reason, suspended_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (chat_id) DO UPDATE
       SET reason = EXCLUDED.reason, suspended_at = now(),
           suspended_by = EXCLUDED.suspended_by, reauth_required = TRUE
     RETURNING chat_id`,
    [String(body.chatId), body.reason?.trim() || "manual", auth.userId],
  );

  await query(
    `INSERT INTO public.alerts (severity, resource_type, title, detail, created_by)
     VALUES ('high', 'bot_session', $1, $2, $3)`,
    [`Bot session suspended: chat ${body.chatId}`, body.reason?.trim() || "manual", auth.userId],
  );

  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, actorType: "system",
    action: "bot_session_suspend", resource: "telegram_session_suspensions",
    resourceId: String(body.chatId),
    afterState: { reason: body.reason ?? null },
  });
  return ok({ chatId: body.chatId, suspended: rows.length > 0 });
}

async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query(
    `SELECT chat_id, reason, suspended_at, suspended_by, reauth_required
       FROM public.telegram_session_suspensions ORDER BY suspended_at DESC LIMIT 100`);
  return ok({ suspensions: rows });
}

export const GET = withAuthorization(implGet, { requiredRole: ["sysadmin", "admin"] });

export const POST = withMutationGuard(implPost, {
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "bot-anomaly", maxRequests: 10 },
});
