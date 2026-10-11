// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { hashPassword, verifyPassword } from "@/lib/auth-token";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import { invalidateAuthCache } from "@/lib/authContext";
import type { AuthContext } from "@/lib/authContext";

const MIN_LEN = 8;
const MAX_LEN = 128;

async function handleChangePassword(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  // 1. CSRF — state-changing endpoint.
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  // 2. Body — accept both camelCase (new) and snake_case (legacy) keys.
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const currentPassword = String(
    body.currentPassword ?? body.current_password ?? body.oldPassword ?? ""
  );
  const newPassword = String(
    body.newPassword ?? body.new_password ?? body.password ?? ""
  );

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
      { status: 400 }
    );
  }
  if (newPassword.length < MIN_LEN) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_LEN} characters` },
      { status: 400 }
    );
  }
  if (newPassword.length > MAX_LEN) {
    return NextResponse.json(
      { error: `New password must be at most ${MAX_LEN} characters` },
      { status: 400 }
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from current password" },
      { status: 400 }
    );
  }

  // 3. Load the caller's current password hash.
  //    Every user — regardless of role — can only change *their own* password;
  //    admin-driven resets go through /api/users/[id].
  const { rows } = await query<{ password_hash: string | null }>(
    `SELECT password_hash FROM public.users WHERE id = $1`,
    [auth.userId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const currentHash = rows[0].password_hash;
  if (!currentHash) {
    return NextResponse.json(
      { error: "No password is set for this account" },
      { status: 400 }
    );
  }

  // 4. Verify the current password (constant-time bcrypt compare).
  const valid = await verifyPassword(currentPassword, currentHash);
  if (!valid) {
    await addAudit({
      action: "LOGIN_FAILED",
      userId: auth.userId,
      role: auth.role,
      details: { reason: "bad_current_password", endpoint: "change-password" },
    }).catch(() => null);

    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  // 5. Hash + persist. Bump session_version in the SAME UPDATE so the
  //    revocation is atomic with the change (Bug 104 pattern).
  const newHash = await hashPassword(newPassword);
  await query(
    `UPDATE public.users
        SET password_hash      = $1,
            last_password_change = NOW(),
            session_version      = session_version + 1,
            updated_at           = NOW()
      WHERE id = $2`,
    [newHash, auth.userId]
  );

  // 6. Best-effort revoke any rows in the sessions table (Supabase-Auth
  //    style deployments). Failure is non-fatal — session_version already
  //    invalidates every existing JWT.
  await query(
    `UPDATE public.sessions
        SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [auth.userId]
  ).catch(() => null);

  // 7. Evict the 30s user-row cache so the new session_version is enforced
  //    on the very next request, not up to 30s later.
  invalidateAuthCache(auth.userId);

  // 8. Audit.
  await addAudit({
    action: "PASSWORD_CHANGED",
    userId: auth.userId,
    role: auth.role,
    details: { self: true, channel: "dashboard" },
  }).catch(() => null);

  return NextResponse.json({
    success: true,
    message: "Password changed. Please sign in again.",
  });
}

// Rate-limit: 10 attempts / 15 min / IP. Prevents brute-forcing the current
// password via this endpoint. withAuthorization first so unauthenticated
// probes are rejected before they hit the limiter bucket.
export const POST = withRateLimit(
  withAuthorization(handleChangePassword),
  { windowMs: 15 * 60 * 1000, maxRequests: 10, keyPrefix: "change-password" }
);