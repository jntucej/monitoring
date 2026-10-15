import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withRateLimit, rateLimitByKey, extractClientIp } from "@/lib/rate-limit";
import { signAccessToken, signRefreshToken } from "@/lib/auth-token";
import crypto from "crypto";
import { addAudit } from "@/lib/db";
import {
  findKioskDefaultOperators,
  resolveKioskGateId,
  resolveKioskGateIdForOperator,
} from "@/lib/kiosk-operator";

/** Fallback gate when the designated kiosk operator has no explicit
 *  assignment — the Main Campus Gate. */
const DEFAULT_GATE_ID = "5f2183c9-51ae-4677-8f38-52a17bbe0538";
import type { Role } from "@/lib/types";

/**
 * GET/POST /api/operator/kiosk-session[?gateId=<uuid>]
 *
 * Mints a short-lived JWT for the designated kiosk default operator so that
 * an unattended gate kiosk can "just work" without manual credential entry.
 *
 * Safety model:
 *   - Exactly ONE active kiosk-default operator (is_kiosk_default = TRUE)
 *     must exist. ZERO or MANY → 503 KIOSK_OPERATOR_MISCONFIGURED.
 *   - Rate-limited per client IP (withRateLimit) AND per kiosk user
 *     (rateLimitByKey, 60/15min).
 *   - Every issued session is audit-logged (OPERATOR_KIOSK_SESSION).
 *   - A real operator's PIN/password login always takes precedence: the
 *     kiosk hook in useKioskOperator only calls this endpoint when the
 *     auth store has NO active session at all.
 *
 * gateId (query, or body { gateId } on POST) — treated as a HINT and
 * validated: allowed only if it equals the operator's gate_id or is in
 * their supervised_gates. No hint (or invalid hint) → operator's assigned
 * gate. The session is bound to the validated gate.
 */

function misconfiguredResponse(count: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "KIOSK_OPERATOR_MISCONFIGURED",
        message:
          `Kiosk configuration error: expected exactly one active kiosk-default operator, found ${count}. ` +
          "Ask a sysadmin to fix gate operator configuration.",
      },
    },
    { status: 503 }
  );
}

async function handleKioskSession(req: NextRequest, bodyGateId?: string | null) {
  try {
    // 1. Locate ALL kiosk default operators — exactly one is required.
    const operators = await findKioskDefaultOperators();
    if (operators.length !== 1) {
      return misconfiguredResponse(operators.length);
    }
    const operator = operators[0];

    // Gate binding: requested gateId is a HINT, validated against the
    // operator's own gate_id / supervised_gates (never trust the body).
    const gateIdParam = bodyGateId ?? req.nextUrl.searchParams.get("gateId")?.trim() ?? null;
    let gate = await resolveKioskGateIdForOperator(operator, gateIdParam);
    let usedFallback = false;
    if (!gate) {
      // Requested hint was invalid/absent (or its gate is inactive) — fall
      // back to the operator's own assignment, then the built-in default.
      if (operator.gate_id) {
        gate = await resolveKioskGateId(operator.gate_id, operator.gate_id);
        usedFallback = true;
      } else {
        gate = await resolveKioskGateId(DEFAULT_GATE_ID, operator.gate_id);
        usedFallback = true;
      }
    }
    if (!gate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_KIOSK_GATE",
            message:
              "No active gate is available for this kiosk session. " +
              "Check that the Main Campus Gate is active in SysAdmin → Gates.",
          },
        },
        { status: 404 }
      );
    }

    // 2. Per-user rate limit (second limiter alongside the per-IP one):
    //    60 sessions / 15 min per kiosk operator.
    const userLimit = await rateLimitByKey(`kiosk_session_user_limit:${operator.id}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 60,
      keyPrefix: "kiosk_session_user_limit",
    });
    if (userLimit.limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many kiosk session requests. Please try again later.",
            resetAt: userLimit.resetTime.toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": (userLimit.retryAfter || 60).toString(),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": userLimit.resetTime.toISOString(),
          },
        }
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
    // signAccessToken has a fixed 1h TTL (no TTL parameter), so the access
    // token stays at 1h; expires_in reports the actual TTL.
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
        requestedGateHint: gateIdParam,
        usedFallback,
        misconfiguredCount: operators.length,
        isExplicitFlag: operator.is_kiosk_default,
        fallbackUsed: !operator.is_kiosk_default && gateIdParam === null,
        ip: extractClientIp(req),
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    // 7. Build response — mirrors /api/auth/pin-login so the client store
    //    can process it with the same toUser() normalizer. Top-level
    //    gateId/operator are additive convenience fields.
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
        gateId: gate?.gateId ?? null,
        operator: {
          id: operator.id,
          name: operator.name,
        },
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

// 200 sessions / 15 min per client IP. A kiosk calls this at most once on
// mount; a sustained flood is an abuse signal worth throttling hard.
export const GET = withRateLimit(
  (req: NextRequest) => handleKioskSession(req, null),
  {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200,
    keyPrefix: "kiosk_session_limit",
  }
);

// POST accepts an optional JSON body { gateId } as the gate hint, with the
// same resolution rules as GET's ?gateId.
export const POST = withRateLimit(
  async (req: NextRequest) => {
    let bodyGateId: string | null = null;
    try {
      const body = (await req.json().catch(() => null)) as unknown;
      if (body && typeof body === "object" && !Array.isArray(body)) {
        const candidate = (body as Record<string, unknown>).gateId;
        if (typeof candidate === "string") {
          bodyGateId = candidate.trim() || null;
        }
      }
    } catch {
      // Non-JSON body is treated as no hint — the gate hint is optional.
    }
    return handleKioskSession(req, bodyGateId);
  },
  {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200,
    keyPrefix: "kiosk_session_limit",
  }
);
