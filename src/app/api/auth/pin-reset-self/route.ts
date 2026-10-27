// src/app/api/auth/pin-reset-self/route.ts
// PIN endpoints disabled (password-only auth). Returns 410 GONE.
import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(
  withAuthorization(async () =>
    NextResponse.json(
      { success: false, error: { code: "GONE", message: "PIN login has been disabled; use your password instead." } },
      { status: 410 }
    )
  ),
  {
    windowMs: 60_000,
    maxRequests: 5,
  }
);
