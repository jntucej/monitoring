import { NextRequest, NextResponse } from "next/server";
import { hash, compare, genSalt } from "@/server/lib/crypto";
import { withRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { hashPassword } from "@/lib/auth-token";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import { assertPasswordPolicy } from "@/server/policy/passwords";
import { verifyBootstrapToken } from "@/lib/bootstrap-link";

const UNIFORM = { success: false, error: { code: "INVALID_CODE", message: "Invalid identifier or enrollment code." } };

export async function GET(_req: NextRequest) {
  try {
    const { rows } = await query<{ count: string }>(
      "SELECT count(*)::text AS count FROM users",
    );
    const count = Number(rows[0]?.count ?? "0");
    return NextResponse.json({ bootstrapped: count > 0 });
  } catch {
    return NextResponse.json({ bootstrapped: false });
  }
}


async function handlePost(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "JSON body required." } }, { status: 400 });
  }

  const { uniqueId, code, newPassword, newPin, token } = body as Record<string, string>;

  // If a secure signed bootstrap token is provided, derive the user ID from it.
  // This prevents an attacker from supplying a different user's ID.
  let targetUserId: string | null = null;
  if (token) {
    targetUserId = verifyBootstrapToken(token);
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: { code: "INVALID_TOKEN", message: "Activation link is invalid or expired." } }, { status: 400 });
    }
  }

  const normId = (uniqueId ?? "").trim().toUpperCase();

  // Resolve the target user by ID or roll.
  let user: any = null;
  if (targetUserId) {
    const { rows: idRows } = await query("SELECT id, name, status, unique_id, onboarded_at FROM users WHERE id = $1 LIMIT 1", [targetUserId]);
    user = idRows[0] ?? null;
  }
  if (!user && normId) {
    const sanitizePostgrestParam = (val: string) => val.replace(/,/g, "%2C");
    const { rows: lookupRows } = await query(
      `SELECT id, name, status, unique_id, onboarded_at FROM users WHERE upper(unique_id) = $1 OR email = lower($1) OR login_identifier = $1 LIMIT 1`,
      [normId]
    );
    user = lookupRows[0] ?? null;
  }
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "INVALID_CODE", message: "User not found." } }, { status: 404 });
  }
  try {
    assertPasswordPolicy(newPassword);
  } catch (e) {
    return NextResponse.json({ success: false, error: { code: "WEAK_PASSWORD", message: e instanceof Error ? e.message : "Password does not meet policy." } }, { status: 400 });
  }
  if (newPin && !/^\d{4,8}$/.test(newPin)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_PIN", message: "PIN must be 4-8 digits." } }, { status: 400 });
  }

  const identifierForAudit = targetUserId ? user.unique_id : normId;
  const rejectAudit = async (u?: any) => {
    await addAudit({
      action: "ENROLLMENT_CODE_REJECTED",
      userId: u?.id ?? "Unknown",
      role: "student" as any,
      details: { identifier: identifierForAudit, reason: "invalid_code", ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown" },
    });
    return NextResponse.json(UNIFORM, { status: 401 });
  };

  const lockKey = `bootstrap:${targetUserId ?? normId}`;
  const lock = await checkRateLimit(lockKey, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
  if (lock.limited) {
    return NextResponse.json({ success: false, error: { code: "LOCKED", message: "Too many attempts. Try again later." } }, { status: 429 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ success: false, error: { code: "ACCOUNT_INACTIVE", message: `Account is ${user.status}.` } }, { status: 403 });
  }
  if (user.onboarded_at) {
    return NextResponse.json({ success: false, error: { code: "ALREADY_ONBOARDED", message: "This account has already completed setup. Use the normal login page." } }, { status: 409 });
  }

  const resRows = await query(
    `SELECT id, code_hash, expires_at FROM enrollment_codes
     WHERE user_id = $1 AND purpose = 'web_bootstrap' AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );
  const rows = resRows.rows as any[];

  const row = rows[0];
  if (!row) return await rejectAudit(user);

  const ok = await compare(String(code).trim().toUpperCase(), row.code_hash);
  if (!ok) return await rejectAudit(user);

  const burnRes = await query(
    `UPDATE enrollment_codes
        SET used_at = NOW()
      WHERE id = $1 AND used_at IS NULL
      RETURNING id`,
    [row.id]
  );
  // Atomic burn: exactly one concurrent caller can flip used_at IS NULL → set.
  // (Mirrors the pattern in mobile/[...path]/route.ts; the PostgREST update
  // above is read-then-write, which lets two requests burn the same row.)
  if (burnRes.rowCount !== 1) {
    // Distinct from the generic rejectAudit: this branch means a concurrent
    // caller burned the code first — a race condition, not a wrong code.
    await addAudit({
      action: "ENROLLMENT_CODE_RACE_LOST",
      userId: user.id,
      userName: user.name,
      role: "student" as any,
      details: {
        identifier: identifierForAudit,
        reason: "concurrent burn — code was claimed by another request",
        ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown",
      },
    });
    return NextResponse.json(UNIFORM, { status: 401 });
  }

  const pwHash = await hashPassword(newPassword);
  const pinHash = newPin && /^\d{4,8}$/.test(newPin) ? await hash(newPin, 10) : null;

  await query(
    `UPDATE users
        SET password_hash      = $1,
            pin_hash           = COALESCE($2, pin_hash),
            initial_pin_hash   = COALESCE($2, initial_pin_hash),
            pin_must_change    = FALSE,
            onboarded_at       = NOW(),
            password_must_change = FALSE,
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