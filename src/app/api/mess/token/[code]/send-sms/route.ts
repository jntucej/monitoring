// src/app/api/mess/token/[code]/send-sms/route.ts
// POST — a student asks us to SMS their mess token code to their on-file
// phone number (E10). Rate-limited; requires the token to be theirs, unused,
// and unexpired.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { sendSMS } from "@/lib/integrations/sms";
import type { AuthContext } from "@/lib/authContext";

function getCode(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 2] ?? "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const code = getCode(req);
  if (!code) return fail("VALIDATION_ERROR", "code required", 400);

  const { rows } = await query<{ user_id: string; expires_at: string; used_at: string | null }>(
    `SELECT user_id, expires_at, used_at
       FROM public.mess_tokens WHERE token_code = $1 LIMIT 1`,
    [code],
  );
  const t = rows[0];
  if (!t || t.user_id !== auth.userId) return fail("FORBIDDEN", "Not your token", 403);
  if (t.used_at) return fail("TOKEN_USED", "Already used", 409);
  if (new Date(t.expires_at).getTime() <= Date.now()) return fail("TOKEN_EXPIRED", "Expired", 410);

  const { rows: phone } = await query<{ phone: string | null }>(
    `SELECT phone FROM public.users WHERE id = $1`,
    [auth.userId],
  );
  if (!phone[0]?.phone) return fail("NO_PHONE", "No phone on file", 400);

  await sendSMS({
    to: phone[0].phone,
    message: `Your mess token: ${code}. Expires ${new Date(t.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
  });

  await addAudit({
    action: "MESS_TOKEN_SMS_SENT",
    userId: auth.userId,
    role: auth.role,
    details: { tokenCode: code },
  });

  return ok({ sent: true });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 3,
  keyPrefix: "mess_sms",
});
