// src/app/api/admin/users/[id]/reset-pin/route.ts
// PIN endpoints disabled (password-only auth). Returns 410 GONE.
import { NextResponse } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";

export const POST = withAdminMutation(
  async () =>
    NextResponse.json(
      { success: false, error: { code: "GONE", message: "PIN login has been disabled; use your password instead." } },
      { status: 410 }
    ),
  {
    rateLimit: { keyPrefix: "admin_user_reset_pin", maxRequests: 20, windowMs: 60_000 },
  }
);
