import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

async function handlePost(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const sessionToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : req.cookies.get("access_token")?.value || req.cookies.get("session-token")?.value;

  if (sessionToken) {
    try {
      await query("DELETE FROM sessions WHERE session_token = $1 OR refresh_token = $1", [sessionToken]);
    } catch {
      // session table may be optional
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
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

export const POST = withRateLimit(handlePost, {
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "logout_limit",
});
