import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { hashPassword } from "@/lib/auth-token";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";

const UNIFORM = { success: false, error: { code: "INVALID_CODE", message: "Invalid identifier or enrollment code." } };

async function handlePost(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "JSON body required." } }, { status: 400 });
  }

  const { uniqueId, code, newPassword, newPin } = body as Record<string, string>;
  if (!uniqueId || !code || !newPassword || !newPin) {
    return NextResponse.json({ success: false, error: { code: "MISSING_FIELDS", message: "uniqueId, code, newPassword, newPin are all required." } }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters." } }, { status: 400 });
  }
  if (!/^\d{4,8}$/.test(newPin)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_PIN", message: "PIN must be 4-8 digits." } }, { status: 400 });
  }

  const normId = uniqueId.trim().toUpperCase();
  const sanitizePostgrestParam = (val: string) => val.replace(/,/g, "%2C");
  const rejectAudit = async (u?: any) => {
    await addAudit({
      action: "ENROLLMENT_CODE_REJECTED",
      userId: u?.id ?? "Unknown",
      role: "student" as any,
      details: { identifier: normId, reason: "invalid_code", ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown" },
    });
    return NextResponse.json(UNIFORM, { status: 401 });
  };

  const lockKey = `bootstrap:${normId}`;
  const lock = await checkRateLimit(lockKey, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
  if (lock.limited) {
    return NextResponse.json({ success: false, error: { code: "LOCKED", message: "Too many attempts. Try again later." } }, { status: 429 });
  }

  const svc = getSupabaseServiceClient();

  const { data: user } = await svc
    .from("users")
    .select("id, name, status, unique_id, onboarded_at")
    .or(`unique_id.eq.${sanitizePostgrestParam(normId)},email.eq.${sanitizePostgrestParam(normId.toLowerCase())},login_identifier.eq.${sanitizePostgrestParam(normId)}`)
    .maybeSingle();

  if (!user) return await rejectAudit(null);
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ success: false, error: { code: "ACCOUNT_INACTIVE", message: `Account is ${user.status}.` } }, { status: 403 });
  }
  if (user.onboarded_at) {
    return NextResponse.json({ success: false, error: { code: "ALREADY_ONBOARDED", message: "This account has already completed setup. Use the normal login page." } }, { status: 409 });
  }

  const { data: rows } = await svc
    .from("enrollment_codes")
    .select("id, code_hash, expires_at")
    .eq("user_id", user.id)
    .eq("purpose", "web_bootstrap")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0];
  if (!row) return await rejectAudit(user);

  const ok = await bcrypt.compare(String(code).trim().toUpperCase(), row.code_hash);
  if (!ok) return await rejectAudit(user);

  const { data: burned } = await svc
    .from("enrollment_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!burned || burned.length === 0) return await rejectAudit(user);

  const pwHash = await hashPassword(newPassword);
  const pinHash = await bcrypt.hash(newPin, 10);

  await query(
    `UPDATE users
        SET password_hash      = $1,
            pin_hash           = $2,
            initial_pin_hash   = $2,
            pin_must_change    = FALSE,
            onboarded_at       = NOW(),
            session_version    = COALESCE(session_version, 0) + 1,
            updated_at         = NOW()
      WHERE id = $3`,
    [pwHash, pinHash, user.id]
  );

  await addAudit({
    action: "USER_ONBOARDED",
    userId: user.id,
    userName: user.name,
    role: "student" as any,
    details: `Completed bootstrap: password + PIN set, onboarded_at stamped.`,
  });

  return NextResponse.json({
    success: true,
    message: "Setup complete. You can now log in with your ID and new password.",
  });
}

export const POST = withRateLimit(handlePost, { keyPrefix: "auth_bootstrap", maxRequests: 10, windowMs: 60_000 });