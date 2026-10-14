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
 * GET  /api/admin/kiosk — kiosk status: who is the default operator, which gate
 * PATCH /api/admin/kiosk — { userId } designate kiosk default (operator only) or { userId: null } to clear
 */

const adminLimit: RateLimitConfig = { ...RATE_LIMITS.admin, keyPrefix: "admin_kiosk" };

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const res = await query<{
      id: string;
      name: string;
      email: string | null;
      gate_id: string | null;
      status: string;
      gate_name: string | null;
    }>(
      `SELECT u.id, u.name, u.email, u.gate_id, u.status, g.name AS gate_name
         FROM public.users u
         LEFT JOIN public.gates g ON g.id = u.gate_id
        WHERE u.is_kiosk_default = TRUE
        ORDER BY u.created_at ASC`
    );

    return NextResponse.json({
      success: true,
      data: {
        kioskDefaultOperator: res.rows[0] ?? null,
        note: "PATCH this endpoint with { userId } to designate a kiosk default operator (operators only).",
      },
    });
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
    const actorId = ctx.auth.userId;
    const actorRole = ctx.auth.role as Role;

    const userId = body.userId === null ? null : body.userId;
    if (userId !== null && (typeof userId !== "string" || !userId.trim())) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "userId must be a user UUID or null." } },
        { status: 400 }
      );
    }

    if (userId) {
      const target = await query<{ role: string; status: string; name: string }>(
        `SELECT role, status, name FROM public.users WHERE id = $1`,
        [userId.trim()]
      );
      const u = target.rows[0];
      if (!u) {
        return NextResponse.json(
          { success: false, error: { code: "USER_NOT_FOUND", message: "User not found." } },
          { status: 404 }
        );
      }
      if (u.role !== "operator") {
        return NextResponse.json(
          { success: false, error: { code: "NOT_OPERATOR", message: "Only operator accounts can be the kiosk default." } },
          { status: 400 }
        );
      }

      // Clear the flag on everyone else (single-flag invariant), then set.
      await query(`UPDATE public.users SET is_kiosk_default = FALSE WHERE is_kiosk_default = TRUE`);
      await query(`UPDATE public.users SET is_kiosk_default = TRUE WHERE id = $1`, [userId.trim()]);
    } else {
      await query(`UPDATE public.users SET is_kiosk_default = FALSE WHERE is_kiosk_default = TRUE`);
    }

    await addAudit({
      action: "KIOSK_DEFAULT_OPERATOR_UPDATED",
      userId: actorId,
      userName: ctx.auth.email,
      role: actorRole,
      details: userId
        ? `Designated user ${userId} as kiosk default operator.`
        : `Cleared kiosk default operator designation.`,
    });

    return NextResponse.json({ success: true, data: { kioskDefaultOperatorId: userId } });
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
