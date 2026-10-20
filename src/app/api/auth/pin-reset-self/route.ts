// src/app/api/auth/pin-reset-self/route.ts
// POST /api/auth/pin-reset-self { password, newPin } — self-service PIN reset.

import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { hashPin, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { password, newPin } = (await req.json().catch(() => ({}))) as {
    password?: string;
    newPin?: string;
  };
  if (!password || !newPin) {
    return fail("VALIDATION_ERROR", "password and newPin required", 400);
  }
  if (!/^\d{6}$/.test(newPin)) {
    return fail("INVALID_PIN", "PIN must be 6 digits", 400);
  }

  const db = getSupabaseServiceClient();
  const { data: row } = await db
    .from("users")
    .select("password_hash")
    .eq("id", auth.userId)
    .maybeSingle();
  if (!row?.password_hash || !(await compare(password, row.password_hash))) {
    return fail("INVALID_PASSWORD", "Wrong password", 401);
  }

  const hashedPin = await hashPin(newPin);
  const { error } = await db
    .from("users")
    .update({
      pin_hash: hashedPin,
      initial_pin_hash: null,
      pin_must_change: false,
      pin_set_at: new Date().toISOString(),
      pin_set_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.userId);
  if (error) return fail("DB_ERROR", error.message, 500);

  await addAudit({
    action: "PIN_CHANGED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { via: "self_reset" },
  });

  return ok({ reset: true });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 5,
});
