import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { invalidateAuthCache } from "@/lib/authContext";
import type { AuthContext } from "@/lib/authContext";

async function handleLogoutAll(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const userId = auth.userId;

  // 1. Bump session_version to immediately invalidate all existing JWTs across all devices
  await query(
    `UPDATE public.users
        SET session_version = COALESCE(session_version, 0) + 1,
            updated_at      = NOW()
      WHERE id = $1`,
    [userId]
  );

  // 2. Revoke any rows in the sessions table
  await query(
    `UPDATE public.sessions
        SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  ).catch(() => null);

  // 3. Evict auth cache immediately
  invalidateAuthCache(userId);

  // 4. Record audit event
  await addAudit({
    action: "SESSION_FORCE_REVOKED",
    userId,
    role: auth.role,
    details: { all_devices: true, self: true, endpoint: "/api/auth/logout-all" },
  }).catch(() => null);

  const response = NextResponse.json({
    success: true,
    message: "Logged out from all devices.",
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set("access_token", "", cookieOptions);
  response.cookies.set("session-token", "", cookieOptions);
  response.cookies.set("refresh_token", "", cookieOptions);
  response.cookies.set("refresh-token", "", cookieOptions);

  return response;
}

export const POST = withRateLimit(
  withAuthorization(handleLogoutAll),
  { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "logout_all_limit" }
);
