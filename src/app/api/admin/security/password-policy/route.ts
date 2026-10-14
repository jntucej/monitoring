import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { addAudit } from "@/lib/db";
import { RATE_LIMITS } from "@/config/app-constants";
import type { RateLimitConfig } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/**
 * GET   /api/admin/security/password-policy — read the stored password policy
 * PATCH /api/admin/security/password-policy — update the stored password policy
 *
 * Persisted in system_settings with id = 'password_policy' (JSONB value).
 */

const adminLimit: RateLimitConfig = { ...RATE_LIMITS.admin, keyPrefix: "admin_password_policy" };

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  maxAgeDays: number;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: false,
  maxAgeDays: 90,
};

async function loadPolicy(): Promise<PasswordPolicy> {
  const res = await query<{ value: unknown }>(
    `SELECT value FROM public.system_settings WHERE id = 'password_policy'`,
    []
  );
  const stored = res.rows[0]?.value;
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const s = stored as Record<string, unknown>;
    return {
      minLength: typeof s.minLength === "number" ? s.minLength : DEFAULT_POLICY.minLength,
      requireUppercase: typeof s.requireUppercase === "boolean" ? s.requireUppercase : DEFAULT_POLICY.requireUppercase,
      requireNumber: typeof s.requireNumber === "boolean" ? s.requireNumber : DEFAULT_POLICY.requireNumber,
      requireSpecial: typeof s.requireSpecial === "boolean" ? s.requireSpecial : DEFAULT_POLICY.requireSpecial,
      maxAgeDays: typeof s.maxAgeDays === "number" ? s.maxAgeDays : DEFAULT_POLICY.maxAgeDays,
    };
  }
  return { ...DEFAULT_POLICY };
}

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const policy = await loadPolicy();
    return NextResponse.json({ success: true, data: policy });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const current = await loadPolicy();

    const next: PasswordPolicy = {
      minLength:
        typeof body.minLength === "number" ? Math.max(1, Math.floor(body.minLength)) : current.minLength,
      requireUppercase:
        typeof body.requireUppercase === "boolean" ? body.requireUppercase : current.requireUppercase,
      requireNumber:
        typeof body.requireNumber === "boolean" ? body.requireNumber : current.requireNumber,
      requireSpecial:
        typeof body.requireSpecial === "boolean" ? body.requireSpecial : current.requireSpecial,
      maxAgeDays:
        typeof body.maxAgeDays === "number" ? Math.max(1, Math.floor(body.maxAgeDays)) : current.maxAgeDays,
    };

    await query(
      `INSERT INTO public.system_settings (id, value, updated_at)
       VALUES ('password_policy', $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(next)]
    );

    await addAudit({
      action: "PASSWORD_POLICY_UPDATED",
      userId: ctx.auth.userId,
      userName: ctx.auth.email,
      role: ctx.auth.role as Role,
      details: `Updated password policy: ${JSON.stringify(next)}`,
    });

    return NextResponse.json({ success: true, data: next });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin"] }),
  adminLimit
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["sysadmin"] }),
  adminLimit
);
