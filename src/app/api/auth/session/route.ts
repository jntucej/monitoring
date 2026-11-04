import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query, withTransaction } from "@/lib/postgres";
import { verifyAccessToken, verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth-token";
import { withRateLimit } from "@/lib/rate-limit";
import { secureCookieOptions } from "@/lib/cookies";

async function handleSessionCheck(req: NextRequest) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      token = req.cookies.get("access_token")?.value;
    }

    if (!token) {
      token = req.headers.get("x-session-token") || undefined;
    }

    const refreshToken =
      req.cookies.get("refresh_token")?.value ||
      req.headers.get("x-refresh-token") ||
      undefined;

    let payload = token ? await verifyAccessToken(token) : null;
    let newToken: string | undefined;
    let newRefreshToken: string | undefined;

    // If access token is expired/invalid, try refreshing using refresh token.
    // MUST ROTATE: insert new session + revoke old, same as /api/auth/refresh.
    // Without this the old refresh token's DB row stays live, and a later
    // /refresh call with that token will trip reuse-detection and revoke ALL sessions.
    if (!payload && refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload && refreshPayload.sub) {
        // Re-read session_version from the live DB row so a revoked session
        // cannot mint a fresh access token via /api/auth/session.
        const userRow = await query(
          "SELECT session_version, email, role, status FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
          [refreshPayload.sub],
        );
        if (userRow.rows.length === 0 || userRow.rows[0].status !== 'ACTIVE') {
          return NextResponse.json(
            { success: false, error: { code: "USER_NOT_FOUND", message: "User account not found or inactive." } },
            { status: 404 },
          );
        }
        const row = userRow.rows[0];
        payload = refreshPayload;
        newToken = await signAccessToken({
          sub: refreshPayload.sub,
          email: row.email,
          role: row.role,
          account_status: row.status,
          session_version: row.session_version ?? 0,
          device_id: req.cookies.get("device_id")?.value, // M4: carry device binding
        });
        newRefreshToken = await signRefreshToken({
          sub: refreshPayload.sub,
          email: refreshPayload.email,
          role: refreshPayload.role,
        });

        // Part 6: atomic consume + family inheritance.
        // The UPDATE...RETURNING is the single-winner primitive: only one
        // concurrent rotation can consume a live token. The new row inherits
        // the family (or creates one when the old row predates the migration
        // and has no family_id yet).
        const oldHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const newHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
        const newSessionId = crypto.randomUUID();
        try {
          await withTransaction(async (client) => {
            const consumed = await client.query<{
              id: string;
              family_id: string;
            }>(
              `UPDATE sessions
                  SET revoked_at = NOW(), rotated_at = NOW()
                WHERE refresh_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
                RETURNING id, family_id`,
              [oldHash]
            );
            const familyId =
              consumed.rowCount === 1
                ? consumed.rows[0].family_id
                : crypto.randomUUID();
            const parent = consumed.rowCount === 1 ? consumed.rows[0].id : null;
            await client.query(
              `INSERT INTO sessions
                 (id, user_id, refresh_hash, expires_at, created_at, family_id, parent_id)
               VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW(), $4, $5)`,
              [newSessionId, refreshPayload.sub, newHash, familyId, parent]
            );
            if (consumed.rowCount === 1) {
              await client.query(
                "UPDATE sessions SET successor_hash = $1 WHERE id = $2",
                [newHash, consumed.rows[0].id]
              );
            }
          });
        } catch {
          // Rotation failed — return the session without rotating. The user
          // keeps their current session; worst case they hit the same expiry
          // again and retry. Never revoke-all on a transient DB blip.
          newToken = undefined;
          newRefreshToken = undefined;
        }
      }
    }

    // Part 6 fail-closed: if a refresh token was presented for rotation but
    // no live session row exists for it (already revoked, unknown, or
    // expired), refuse to mint an access token. Minting here would let a
    // stolen refresh token resurrect a killed session.
    if (refreshToken && !payload?.sub && !newToken) {
      const probe = await query(
        "SELECT 1 FROM sessions WHERE refresh_hash = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1",
        [crypto.createHash("sha256").update(refreshToken).digest("hex")]
      ).catch(() => ({ rows: [] as unknown[] }));
      if (probe.rows.length === 0) {
        // Refresh row is revoked / unknown / expired. Kill the whole family
        // on reuse (theft signal) and force a re-login.
        const rev = await query<{ family_id: string | null }>(
          "SELECT family_id FROM sessions WHERE refresh_hash = $1 LIMIT 1",
          [crypto.createHash("sha256").update(refreshToken).digest("hex")]
        ).catch(() => ({ rows: [] as { family_id: string | null }[] }));
        const fam = rev.rows[0]?.family_id;
        if (fam) {
          await query(
            "UPDATE public.sessions SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL",
            [fam]
          ).catch(() => undefined);
        }
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_TOKEN", message: "Session expired. Sign in again." },
          },
          { status: 401 },
        );
      }
    }

    if (!payload || !payload.sub) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or missing session." },
        },
        { status: 401 }
      );
    }

    const userRes = await query(
      "SELECT id, unique_id, email, name, role, status, department_id, photo_url, supervised_gates, assigned_hostel, gate_id FROM users WHERE id = $1 LIMIT 1",
      [payload.sub]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User account not found." },
        },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ACCOUNT_INACTIVE", message: `User account is ${user.status}.` },
        },
        { status: 403 }
      );
    }

    const rolesRes = await query<{ role: string }>(`SELECT role FROM user_roles WHERE user_id = $1`, [user.id]);
    const roles = rolesRes.rows.map(r => r.role);
    if (!roles.includes(user.role)) roles.push(user.role);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        uniqueId: user.unique_id,
        email: user.email,
        name: user.name,
        role: user.role,
          roles,
        status: user.status,
        departmentId: user.department_id,
        photoUrl: user.photo_url,
        supervisedGates: user.supervised_gates,
        assignedHostel: user.assigned_hostel,
        gateId: user.gate_id,
      },
      ...(newToken ? { accessToken: newToken } : {}),
      ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
    });

    if (newToken) {
      response.cookies.set("access_token", newToken, secureCookieOptions(req, { maxAge: 3600 }));
      if (newRefreshToken) {
        response.cookies.set("refresh_token", newRefreshToken, secureCookieOptions(req, { maxAge: 7 * 24 * 3600 }));
      }
    }

    return response;
  } catch (error: unknown) {
    console.error("[Auth:Session] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to validate session." },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleSessionCheck, {
  keyPrefix: "auth_session",
  maxRequests: 120,
  windowMs: 60 * 1000,
});
