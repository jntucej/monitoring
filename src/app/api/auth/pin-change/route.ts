// src/app/api/auth/pin-change/route.ts
// PIN endpoints disabled (password-only auth). Returns 410 GONE.
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";

export const POST = withRateLimit(
  withAuthorization(async () =>
    NextResponse.json(
      { success: false, error: { code: "GONE", message: "PIN login has been disabled; use your password instead." } },
      { status: 410 }
    )
  ),
  { keyPrefix: "pin_change", maxRequests: 10 }
);
