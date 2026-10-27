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
 * GET  /api/admin/security/lockout — list locked accounts (login_attempts + users)
 * POST /api/admin/security/lockout — unlock a user: { identifier } or { userId }
 */

const adminLimit: RateLimitConfig = { ...RATE_LIMITS.admin, keyPrefix: "admin_security_lockout" };

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const res = await query<{
      identifier: string;
      failed_count: number;
      locked_until: string | null;
      last_channel: string | null;
      last_attempt_at: string | null;
      user_name: string | null;
      user_id: string | null;
    }>(
      `SELECT la.identifier, la.failed_count, la.locked_until, la.last_channel, la.last_attempt_at,
              u.name AS user_name, u.id AS user_id
         FROM public.login_attempts la
         LEFT JOIN public.users u
           ON COALESCE(u.login_identifier, LOWER(u.unique_id)) = la.identifier
        WHERE la.locked_until IS NOT NULL AND la.locked_until > NOW()
        ORDER BY la.last_attempt_at DESC NULLS LAST`
    );

    return NextResponse.json({
      success: true,
      data: res.rows.map((r) => ({
        identifier: r.identifier,
        failedCount: r.failed_count,
        lockedUntil: r.locked_until,
        lastChannel: r.last_channel,
        lastAttemptAt: r.last_attempt_at,
        userName: r.user_name,
        userId: r.user_id,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const actorId = ctx.auth.userId;
    const actorRole = ctx.auth.role as Role;

    let identifier: string | undefined = undefined;
    if (typeof body.identifier === "string" && body.identifier.trim()) {
      identifier = body.identifier.trim().toLowerCase();
    }

    if (!identifier) {
      if (typeof body.userId !== "string" || !body.userId.trim()) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "Provide 'identifier' (login identifier) or 'userId' (user UUID)." } },
          { status: 400 }
        );
      }
      const userRes = await query<{ login_identifier: string | null; unique_id: string }>(
        `SELECT login_identifier, LOWER(unique_id) FROM public.users WHERE id = $1`,
        [body.userId.trim()]
      );
      const u = userRes.rows[0];
      if (!u) {
        return NextResponse.json(
          { success: false, error: { code: "USER_NOT_FOUND", message: "User not found." } },
          { status: 404 }
        );
      }
      identifier = (u.login_identifier ?? u.unique_id).toLowerCase();
    }

    await query(
      `UPDATE public.users
          SET locked_until = NULL, failed_login_count = 0
        WHERE COALESCE(login_identifier, LOWER(unique_id)) = $1`,
      [identifier]
    );
    await query(
      `UPDATE public.login_attempts
          SET failed_count = 0, locked_until = NULL
        WHERE identifier = $1`,
      [identifier]
    );

    await addAudit({
      action: "ACCOUNT_UNLOCKED",
      userId: actorId,
      userName: ctx.auth.email,
      role: actorRole,
      details: `Unlocked account for identifier '${identifier}' (cleared users.locked_until / failed_login_count and login_attempts lockout).`,
    });

    return NextResponse.json({ success: true, data: { identifier, unlocked: true } });
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

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["sysadmin"] }),
  adminLimit
);
