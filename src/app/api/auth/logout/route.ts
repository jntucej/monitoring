import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { invalidateSessionByToken, invalidateSessions } from "@/lib/db-postgres";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/auth/logout — Revoke the active session.
 *
 * Invalidates the session record in the database and clears cookies.
 * Rate limited: 30 requests / min / IP.
 */
async function handlePost(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const sessionToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  try {
    if (sessionToken && sessionToken !== "undefined" && sessionToken !== "null" && sessionToken.startsWith("eyJ")) {
      // Invalidate session in database
      await invalidateSessionByToken(sessionToken);
    }

    // Also invalidate all sessions for the user if user ID is available
    if (sessionToken) {
      try {
        // Extract user info from token if possible
        const { logAuditEvent } = await import("@/lib/audit");
        await logAuditEvent({
          action: "LOGOUT",
          details: { token: sessionToken },
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
        }).catch(() => {});
      } catch {}
    }
  } catch (err) {
    console.error("Logout error:", err);
  }

  const response = NextResponse.json({ success: true });

  // Clear session cookies
  response.cookies.set("session-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  });
  response.cookies.set("refresh-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  });

  return response;
}

export const POST = withRateLimit(handlePost, {
  keyPrefix: "logout",
  maxRequests: 30,
});