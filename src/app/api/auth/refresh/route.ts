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

    // Part 6 — atomic rotation + family-aware reuse detection.
    // FAIL CLOSED: if we cannot read the sessions table, we must NOT mint
    // new tokens — an attacker exploiting a DB blip would otherwise get a
    // fresh pair for an already-revoked token.
    //
    // Model:
    //   family_id  — lineage of a login. Every rotation inherits the family.
    //   successor_hash — written onto the old row after rotation so a stale
    //                tab re-presenting the old token within the grace
    //                window is recognized as a race, not a theft.
    //   rotated_at — when the row was consumed, for the grace window.
    const oldTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const GRACE_MS = 30_000;

    type Outcome =
      | { kind: "rotated"; row: { id: string; user_id: string; family_id: string } }
      | { kind: "grace"; row: { id: string; user_id: string; family_id: string } }
      | { kind: "reuse"; familyId: string; userId: string; presentedHash: string }
      | { kind: "unknown" }
      | { kind: "expired" };

    let outcome: Outcome;
    const reuseAuditRef: { current: { userId: string; familyId: string; presentedHash: string } | null } = { current: null };
    try {
      outcome = await withTransaction(async (client) => {
        // 1. Atomic consume — only one caller can win the rotation.
        const consumed = await client.query<{
          id: string;
          user_id: string;
          family_id: string;
        }>(
          `UPDATE public.sessions
              SET revoked_at = NOW(),
                  rotated_at = NOW()
            WHERE refresh_hash = $1
              AND revoked_at IS NULL
              AND expires_at > NOW()
            RETURNING id, user_id, family_id`,
          [oldTokenHash]
        );

        if (consumed.rowCount === 1) {
          return {
            kind: "rotated" as const,
            row: consumed.rows[0],
          };
        }

        // 2. Not consumable. Look up the row even if revoked to decide why.
        const existing = await client.query<{
          id: string;
          user_id: string;
          family_id: string;
          successor_hash: string | null;
          revoked_at: string | null;
          rotated_at: string | null;
          expires_at: string;
        }>(
          `SELECT id, user_id, family_id, successor_hash, revoked_at, rotated_at, expires_at
             FROM public.sessions
            WHERE refresh_hash = $1`,
          [oldTokenHash]
        );

        if (existing.rowCount === 0) {
          return { kind: "unknown" as const };
        }

        const row = existing.rows[0];

        // 3. Concurrent-refresh grace window: rotated very recently AND a
        //    successor was already minted — the second tab still holds the
        //    old cookie. Return the grace path so it mints from the same
        //    family instead of tripping reuse-detection.
        if (
          row.rotated_at &&
          row.successor_hash &&
          Date.now() - new Date(row.rotated_at).getTime() < GRACE_MS
        ) {
          return { kind: "grace" as const, row: { id: row.id, user_id: row.user_id, family_id: row.family_id } };
        }

        // 4. Reuse detection: an already-revoked token was presented
        //    outside the grace window — theft. Revoke the entire family and
        //    bump session_version so every access token in the lineage dies
        //    immediately.
        if (row.revoked_at) {
          await client.query(
            `UPDATE public.sessions
                SET revoked_at = NOW()
              WHERE family_id = $1 AND revoked_at IS NULL`,
            [row.family_id]
          );
          await client.query(
            `UPDATE public.users
                SET session_version = session_version + 1, handle = gen_random_uuid()::text
              WHERE id = $1`,
            [row.user_id]
          );
          // Defer the audit write until AFTER the transaction commits:
          // addAudit goes through the Supabase service client which is
          // slow enough to trip idle_in_transaction_session_timeout (10s)
          // when it runs while the tx is still open.
          reuseAuditRef.current = {
            userId: row.user_id,
            familyId: row.family_id,
            presentedHash: oldTokenHash,
          };
          return {
            kind: "reuse" as const,
            familyId: row.family_id,
            userId: row.user_id,
            presentedHash: oldTokenHash,
          };
        }

        // 5. Expired, not revoked.
        return { kind: "expired" as const };
      });
    } catch (err) {
      console.error("[refresh] rotation transaction failed:", err);
      return NextResponse.json(
        {
          success: false,
          error: { code: "SERVER_ERROR", message: "Session rotation failed. Try again." },
        },
        { status: 503 }
      );
    }

    // Deferred reuse audit — fresh pool connection, tx already committed.
    if (reuseAuditRef.current) {
      try {
        await addAudit({
          action: "REFRESH_REUSE_DETECTED",
          userId: reuseAuditRef.current.userId,
          userName: "(refresh)",
          role: "system" as Role,
          details: {
            familyId: reuseAuditRef.current.familyId,
            presentedHash: reuseAuditRef.current.presentedHash.slice(0, 16),
          },
        });
      } catch (auditErr) {
        console.warn("[refresh] deferred REFRESH_REUSE_DETECTED audit write failed:", auditErr);
      }
    }

    if (outcome.kind === "unknown" || outcome.kind === "expired") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token." } },
        { status: 401 }
      );
    }

    if (outcome.kind === "reuse") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "TOKEN_REVOKED", message: "Session family revoked — sign in again." },
        },
        { status: 401 }
      );
    }

    const familyId = outcome.row.family_id;

    // 3. Mint the new pair. Both "rotated" and "grace" reach here.
    const access_token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      account_status: user.status,
      name: user.name,
      session_version: user.session_version ?? 0,
      device_id: req.cookies.get("device_id")?.value, // M4: carry device binding through refresh
    });

    const refresh_token = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(payload.cnf ? { cnf: payload.cnf} : {}),
    });

    // 4. Persist the new session row, inheriting family_id + parent_id.
    //    On the grace path the parent is the row that already rotated; on
    //    the rotated path the parent is the row we just consumed.
    const newSessionId = crypto.randomUUID();
    const newTokenHash = crypto.createHash("sha256").update(refresh_token).digest("hex");
    const parentId = outcome.row.id;
    try {
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO sessions
             (id, user_id, refresh_hash, expires_at, created_at, family_id, parent_id)
           VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW(), $4, $5)`,
          [newSessionId, user.id, newTokenHash, familyId, parentId]
        );
        // 5. Write the successor hash back on the old row so the grace path
        //    can recognize a legitimate concurrent tab.
        await client.query(
          "UPDATE public.sessions SET successor_hash = $1 WHERE id = $2",
          [newTokenHash, parentId]
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
        action: "REFRESH_ROTATED",
        userId: user.id,
        userName: user.name,
        role: user.role as Role,
        details: { familyId, grace: outcome.kind === "grace" },
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
