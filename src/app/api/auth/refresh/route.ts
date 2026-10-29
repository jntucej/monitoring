import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query, withTransaction } from "@/lib/postgres";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth-token";
import { verifyDPoPProof } from "@/lib/dpop";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { secureCookieOptions } from "@/lib/cookies";
import { addAudit } from "@/lib/db";
import type { Role } from "@/lib/types";

async function handleRefresh(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  try {
    let token = req.cookies.get("refresh_token")?.value || req.cookies.get("refresh-token")?.value;

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      token = req.headers.get("x-refresh-token") || undefined;
    }

    if (!token) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === "object" && (body as Record<string, unknown>).refresh_token) {
        token = String((body as Record<string, unknown>).refresh_token);
      } else if (body && typeof body === "object" && (body as Record<string, unknown>).refreshToken) {
        token = String((body as Record<string, unknown>).refreshToken);
      }
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_TOKEN", message: "No refresh token provided." },
        },
        { status: 401 }
      );
    }

    const payload = await verifyRefreshToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token." },
        },
        { status: 401 }
      );
    }

    // RFC 9449 DPoP verification:
    // If the token was bound to a client public key (cnf.jkt), the client MUST present a valid DPoP proof.
    // Kiosk and service tokens (is_kiosk or without cnf) remain exempt.
    const expectedJkt = payload.cnf?.jkt;
    const dpopHeader = req.headers.get("dpop");

    if (expectedJkt) {
      if (!dpopHeader) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DPOP_PROOF_REQUIRED",
              message: "A DPoP proof is required to refresh this sender-constrained session.",
            },
          },
          { status: 401 }
        );
      }

      const dpopValidation = await verifyDPoPProof(dpopHeader, req.method, req.nextUrl.pathname);
      if (!dpopValidation.valid || dpopValidation.jkt !== expectedJkt) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_DPOP_PROOF",
              message: dpopValidation.error || "DPoP thumbprint mismatch.",
            },
          },
          { status: 401 }
        );
      }
    } else if (dpopHeader) {
      // Opportunistic DPoP binding if client provides a proof for an unbound session
      const dpopValidation = await verifyDPoPProof(dpopHeader, req.method, req.nextUrl.pathname);
      if (dpopValidation.valid && dpopValidation.jkt) {
        payload.cnf = { jkt: dpopValidation.jkt };
      }
    }

    const userRes = await query("SELECT * FROM users WHERE id = $1 AND status = 'ACTIVE' LIMIT 1", [
      payload.sub,
    ]);

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User is no longer active." },
        },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    // Refresh token rotation and reuse detection.
    // FAIL CLOSED: if we cannot read the sessions table, we must NOT mint new
    // tokens — an attacker exploiting a DB blip (pool exhaustion, timeout)
    // would otherwise get a fresh pair for an already-revoked token.
    const oldTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    let existingSession: { rows: Array<{ id: string; revoked_at: string | null }> };
    try {
      existingSession = await query(
        "SELECT id, revoked_at FROM sessions WHERE refresh_hash = $1 LIMIT 1",
        [oldTokenHash]
      );
    } catch (err) {
      console.error("[refresh] reuse-detection query failed:", err);
      return NextResponse.json(
        {
          success: false,
          error: { code: "SERVER_ERROR", message: "Session validation unavailable. Try again." },
        },
        { status: 503 }
      );
    }

    if (existingSession.rows.length > 0 && existingSession.rows[0].revoked_at) {
      // Two cases:
      //   (a) Genuine theft: long-revoked token reused → revoke all.
      //   (b) Concurrent-rotation race: two tabs or a retry fired /refresh
      //       within a short window; the first rotated, the second sees the
      //       old row revoked but a live session still exists. In that case
      //       return 409 (not 401) so the client re-syncs via /api/auth/session
      //       without destroying the user's other active tabs.
      const GRACE_MS = 90_000;
      const revokedAt = new Date(existingSession.rows[0].revoked_at).getTime();
      const withinGrace = Date.now() - revokedAt < GRACE_MS;
      let hasLiveSession = false;
      if (withinGrace) {
        try {
          const live = await query(
            "SELECT 1 FROM sessions WHERE user_id = $1 AND revoked_at IS NULL LIMIT 1",
            [payload.sub]
          );
          hasLiveSession = live.rows.length > 0;
        } catch {
          hasLiveSession = false; // DB blip → fail closed to revoke-all
        }
      }

      if (withinGrace && hasLiveSession) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SESSION_RACE",
              message: "Session was just rotated. Please retry with the current session.",
            },
          },
          { status: 409 }
        );
      }

      // Genuine reuse of a long-revoked token → revoke all (theft signal).
      await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1", [payload.sub]).catch(() => {});
      await addAudit({
        action: "SESSION_ROTATED",
        userId: user.id,
        userName: user.name,
        role: user.role as Role,
        details: "Refresh token reuse of a long-revoked session detected — all sessions revoked (theft signal)",
      });
      return NextResponse.json(
        {
          success: false,
          error: { code: "TOKEN_REVOKED", message: "Refresh token has been revoked." },
        },
        { status: 401 }
      );
    }

    const access_token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      account_status: user.status,
      name: user.name,
      session_version: user.session_version ?? 0,
    });

    const refresh_token = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(payload.cnf ? { cnf: payload.cnf } : {}),
    });

    // Atomic rotation: insert new session AND revoke old one in a single
    // transaction. If the insert fails, the revoke is rolled back and the
    // user's old session remains valid — they are never left without one.
    const newSessionId = crypto.randomUUID();
    const newTokenHash = crypto.createHash("sha256").update(refresh_token).digest("hex");
    try {
      await withTransaction(async (client) => {
        await client.query(
          "INSERT INTO sessions (id, user_id, refresh_hash, expires_at, created_at) VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW())",
          [newSessionId, user.id, newTokenHash]
        );
        await client.query(
          "UPDATE sessions SET revoked_at = NOW() WHERE refresh_hash = $1",
          [oldTokenHash]
        );
      });
    } catch (err: unknown) {
      console.error("[refresh] session rotation transaction failed:", err);
      return NextResponse.json(
        {
          success: false,
          error: { code: "SERVER_ERROR", message: "Session rotation failed. Try again." },
        },
        { status: 503 }
      );
    }

    // Audit the rotation (success path) — a stolen session's rotation trail is
    // the first thing a reviewer looks for after an incident.
    try {
      await addAudit({
        action: "SESSION_ROTATED",
        userId: user.id,
        userName: user.name,
        role: user.role as Role,
        details: "Refresh token rotated; prior session revoked",
      });
    } catch {
      // audit is best-effort — never fail the refresh on an audit write
    }

    const cookieOptions = secureCookieOptions(req, { maxAge: 3600 });

    const response = NextResponse.json(
      {
        success: true,
        message: "Session refreshed",
        // Return the fresh tokens in the body so a client that cannot read
        // the httpOnly cookies (e.g. a cross-origin iframe, or a fetch() with
        // credentials that doesn't persist them) can still update its in-memory
        // store. The cookies remain the source of truth; this is a hint.
        accessToken: access_token,
        refreshToken: refresh_token,
      },
      { status: 200 }
    );

    response.cookies.set("access_token", access_token, { ...cookieOptions, maxAge: 3600 });
    response.cookies.set("session-token", access_token, { ...cookieOptions, maxAge: 3600 });
    response.cookies.set("refresh_token", refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 3600 });
    response.cookies.set("refresh-token", refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 3600 });

    return response;
  } catch (err: unknown) {
    console.error("[Refresh Route Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during token refresh." },
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleRefresh, {
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: "refresh_limit",
});
