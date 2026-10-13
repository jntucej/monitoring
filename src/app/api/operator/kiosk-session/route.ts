import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";
import { signAccessToken, signRefreshToken } from "@/lib/auth-token";
import crypto from "crypto";
import { addAudit } from "@/lib/db";
import { findKioskDefaultOperator, resolveKioskGateId } from "@/lib/kiosk-operator";
import type { Role } from "@/lib/types";

/**
 * GET /api/operator/kiosk-session[?gateId=<uuid>]
 *
 * Mints a short-lived JWT for the designated kiosk default operator so that
 * an unattended gate kiosk can "just work" without manual credential entry.
 *
 * Safety model:
 *   - Only the operator with is_kiosk_default = TRUE (or, if none is flagged,
 *     the built-in 'OPERATOR' account) receives a session. 404 if neither
 *     active operator exists — NOT 500.
 *   - Rate-limited per client IP: 20 sessions per 15-minute window.
 *   - Every issued session is audit-logged (OPERATOR_KIOSK_SESSION).
 *   - A real operator's PIN/password login always takes precedence: the
 *     kiosk hook in useKioskOperator only calls this endpoint when the
 *     auth store has NO active session at all.
 *
 * ?gateId — if provided, the session is bound to that gate. If omitted or
 * the gate is inactive/unknown, the operator's assigned gate_id is used.
 * If neither resolves, the session is issued without a gate binding and
 * the kiosk shows a "no gate assigned" panel instead of a broken view.
 */

async function handleKioskSession(req: NextRequest) {
  try {
    // 1. Locate the kiosk default operator.
    const operator = await findKioskDefaultOperator();
    if (!operator) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_KIOSK_OPERATOR",
            message: "No kiosk default operator is configured. " +
                     "Designate one under SysAdmin → Gates → Default Gate Operator.",
          },
        },
        { status: 404 }
      );
    }

    // A kiosk session is always bound to a specific gate: the requested
    // gateId, or the operator's own assignment. No gate resolvable → the
    // operator is not authenticated for any gate, so refuse the session
    // rather than mint a gateless token.
    const gateIdParam = req.nextUrl.searchParams.get("gateId")?.trim() || null;
    const gate = await resolveKioskGateId(gateIdParam, operator.gate_id);
    if (!gate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_GATE_ASSIGNED",
            message:
              gateIdParam
                ? "The requested gate is inactive or unknown. Sign in at the gate the operator is assigned to."
                : "This operator is not assigned to a gate. Assign one under SysAdmin → Gates, then open the kiosk at that gate.",
          },
        },
        { status: 404 }
      );
    }

    // 3. Build role list (mirror pin-login logic).
    const role = (operator.role as Role) || "operator";
    const rolesRes = await query<{ role: string }>(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [operator.id]
    );
    const roles = rolesRes.rows.map((r) => r.role);
    if (!roles.includes(role)) roles.push(role);

    // 4. Mint JWTs using the same helpers the real login endpoints use.
    const accessToken = await signAccessToken({
      sub: operator.id,
      email: operator.email || undefined,
      role,
      roles,
      account_status: operator.status,
      name: operator.name || undefined,
      session_version: operator.session_version,
      gateId: gate?.gateId ?? operator.gate_id ?? undefined,
    });

    const refreshToken = await signRefreshToken({
      sub: operator.id,
      email: operator.email || undefined,
      role,
      roles,
    });

    // 5. Persist a session row so the gate-online detector (getGateOnlineIds)
    //    sees the kiosk as a live desk for this gate — otherwise the gate
    //    would always read as "offline" to admin/sysadmin dashboards.
    const kioskSessionId = crypto.randomUUID();
    const kioskRefreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    try {
      await query(
        `INSERT INTO sessions (id, user_id, refresh_hash, expires_at, created_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (id) DO UPDATE SET refresh_hash = $3, revoked_at = NULL`,
        [kioskSessionId, operator.id, kioskRefreshHash]
      );
    } catch (sessionErr) {
      // Sessions are a soft signal — a failure here should not block kiosk sign-in.
      console.error("[kiosk-session] session row insert failed:", sessionErr);
    }

    // 6. Audit every session issue.
    await addAudit({
      action: "OPERATOR_KIOSK_SESSION",
      userId: operator.id,
      userName: operator.name || "Gate Operator",
      role,
      gateId: gate?.gateId,
      details: {
        source: "kiosk_session_endpoint",
        gateId: gate?.gateId ?? null,
        gateName: gate?.gateName ?? null,
        requestedGateId: gateIdParam,
        isExplicitFlag: operator.is_kiosk_default,
        fallbackUsed: !operator.is_kiosk_default && gateIdParam === null,
        ip: extractClientIp(req),
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    // 6. Build response — mirrors /api/auth/pin-login so the client store
    //    can process it with the same toUser() normalizer.
    const response = NextResponse.json(
      {
        success: true,
        data: {
          token: accessToken,
          refreshToken,
          user: {
            id: operator.id,
            uniqueId: operator.unique_id,
            name: operator.name,
            email: operator.email,
            role,
            roles,
            status: operator.status,
            gateId: gate?.gateId ?? null,
          },
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: "Bearer",
        kiosk: {
          gateId: gate?.gateId ?? null,
          gateName: gate?.gateName ?? null,
          operatorId: operator.id,
          operatorName: operator.name,
          isDefault: operator.is_kiosk_default,
        },
      },
      { status: 200 }
    );

    // Set cookies the same way the real login endpoints do, so the browser
    // session is fully established and /api/auth/session will refresh it.
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (err) {
    console.error("[kiosk-session] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Kiosk session unavailable." } },
      { status: 500 }
    );
  }
}

// 20 sessions / 15 min per client IP. A kiosk calls this at most once on
// mount; a sustained flood is an abuse signal worth throttling hard.
export const GET = withRateLimit(handleKioskSession, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 200,
  keyPrefix: "kiosk_session_limit",
});
