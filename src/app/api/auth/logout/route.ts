import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Logged out successfully." });

  // Clear authentication cookies
  response.cookies.set("access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export const POST = withRateLimit(handlePost, {
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "logout_limit",
});
