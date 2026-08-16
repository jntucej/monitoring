import { NextRequest, NextResponse } from "next/server";
import { withAuthAndStatus } from "@/middleware/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { canUserAuthenticate } from "@/lib/supabaseClient";

async function handlePost() {
  // The token has already been validated by withAuthAndStatus.
  // We return success because the client should clear its own token.
  return NextResponse.json({ success: true });
}

export const POST = withRateLimit(
  withAuthAndStatus(handlePost),
  { keyPrefix: 'logout', maxRequests: 10 }
);
