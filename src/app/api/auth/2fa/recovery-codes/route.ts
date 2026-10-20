// src/app/api/auth/2fa/recovery-codes/route.ts
// GET  /api/auth/2fa/recovery-codes — remaining recovery-code count.
// POST /api/auth/2fa/recovery-codes { password } — regenerate 10 codes (password required).

import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import { compare } from "bcryptjs";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data: row } = await db
    .from("users")
    .select("two_factor_recovery_codes")
    .eq("id", auth.userId)
    .maybeSingle();
  const remaining =
    Array.isArray(row?.two_factor_recovery_codes)
      ? row!.two_factor_recovery_codes.length
      : 0;
  return ok({ remaining });
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  if (!password) return fail("VALIDATION_ERROR", "password required", 400);

  const db = getSupabaseServiceClient();
  const { data: row } = await db
    .from("users")
    .select("password_hash")
    .eq("id", auth.userId)
    .maybeSingle();
  if (!row?.password_hash || !(await compare(password, row.password_hash))) {
    return fail("INVALID_PASSWORD", "Wrong password", 401);
  }

  const codes = Array.from({ length: 10 }, () =>
    randomBytes(5)
      .toString("hex")
      .toUpperCase()
      .match(/.{1,5}/g)!.join("-"),
  );
  const hashed = codes.map(hashCode);

  const { error } = await db
    .from("users")
    .update({
      two_factor_recovery_codes: hashed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.userId);
  if (error) return fail("DB_ERROR", error.message, 500);

  await addAudit({
    action: "MFA_RECOVERY_CODES_REGENERATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: {},
  });

  // Shown once — the stored values are hashes.
  return ok({ codes });
}

export const GET = withAuthorization(handleGet);
export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 5,
});
