import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { secureCookieOptions } from "@/lib/cookies";

async function handlePost(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const sessionToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : req.cookies.get("access_token")?.value || req.cookies.get("session-token")?.value;

  // Part 6 — logout must invalidate the entire session FAMILY, not just the
  // row the cookie points at. A sibling token from the same login (another
  // tab, a rotated descendant) must die with the user's logout.
  const refreshCookie =
    req.cookies.get("refresh_token")?.value || req.cookies.get("refresh-token")?.value;
  if (refreshCookie) {
    const hash = crypto.createHash("sha256").update(refreshCookie).digest("hex");
    try {
      await query(
        `UPDATE public.sessions
            SET revoked_at = NOW()
          WHERE revoked_at IS NULL
            AND family_id = (
              SELECT family_id FROM public.sessions WHERE refresh_hash = $1 LIMIT 1
            )`,
        [hash]
      );
    } catch {
      // Best-effort family revocation
    }
  }

  if (sessionToken) {
    try {
      await query(
        "UPDATE sessions SET revoked_at = NOW() WHERE refresh_hash = $1 OR user_id::text = $1 OR id::text = $1",
        [sessionToken]
      );
    } catch {
      // Best-effort session table revocation
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  const cookieOptions = secureCookieOptions(req, { maxAge: 0 });

  response.cookies.set("access_token", "", cookieOptions);
  response.cookies.set("session-token", "", cookieOptions);
  response.cookies.set("refresh_token", "", cookieOptions);
  response.cookies.set("refresh-token", "", cookieOptions);

  return response;
}

export const POST = withRateLimit(handlePost, {
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "logout_limit",
});
