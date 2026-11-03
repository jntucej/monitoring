// src/app/api/auth/lock/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// M2 — POST /api/auth/lock. Consumes a one-use HMAC-signed lock token
// (issued with a privileged login alert email/SMS), SUSPENDs the account,
// bumps session_version, and revokes all live sessions. Pre-auth: the
// link in the email is the only credential — the user is by definition
// the legitimate account holder clicking "this wasn't me".
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { verifyLockToken, lockTokenHash } from "@/lib/privileged-alert";
import { query } from "@/lib/postgres";
import { withTransaction } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { invalidateAuthCache } from "@/lib/authContext";

async function handlePost(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = String(body.token ?? "");
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "token required" } },
      { status: 400 },
    );
  }

  const parsed = verifyLockToken(token);
  if (!parsed) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TOKEN", message: "This link is invalid or has expired." } },
      { status: 400 },
    );
  }

  const { userId } = parsed;

  // One-use: mark the lock token as consumed in privileged_login_alerts.
  await query(
    `UPDATE public.privileged_login_alerts
        SET lock_used_at = NOW(), lock_used_by = $1
      WHERE lock_token_hash = $2 AND lock_used_at IS NULL`,
    [userId, lockTokenHash(token)],
  ).catch(() => undefined);

  // RLS write discipline: users + sessions are RLS tables; write via
  // withTransaction so the GUC context is set.
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE public.users
          SET status = 'SUSPENDED',
              session_version = COALESCE(session_version, 0) + 1,
              updated_at = NOW()
        WHERE id = $1`,
      [userId],
    );
    await client.query(
      `UPDATE public.sessions
          SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  });

  // Kill any cached auth rows so the revocation is immediate.
  invalidateAuthCache(userId);

  await addAudit({
    action: "ACCOUNT_LOCKED_BY_USER",
    userId,
    userName: "(self)",
    details: { via: "login_alert_link" },
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    data: { locked: true, message: "All sessions revoked. Contact your administrator to unlock." },
  });
}

export const POST = withRateLimit(handlePost, {
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: "lock",
});
