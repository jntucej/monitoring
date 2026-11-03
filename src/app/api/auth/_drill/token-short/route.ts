import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getAuthSigningKey, getAuthSigningKid } from "@/lib/auth-token";
import { query } from "@/lib/postgres";

/**
 * J1.2 — test-only endpoint that mints a short-TTL access token for the
 * JWT-expiry-mid-scan drill.
 *
 * Guard rails (ALL must hold before a token is issued):
 *   - process.env.DRILL_MODE === "true"  (explicit per-host opt-in; the
 *     compose file only forwards DRILL_MODE/DRILL_SECRET, so an
 *     unconfigured host never enables this route)
 *   - x-drill-mode header === DRILL_SECRET env (timing-safe compare)
 *   - the requested user exists, is ACTIVE, and is NOT admin/sysadmin
 *     (a drill token must not carry privileged identity)
 *
 * The token is signed with the SAME key + kid material as production
 * access tokens, but with exp = iat + 2s. It is NOT persisted anywhere
 * and cannot be refreshed. The drill script (J1.2) uses it to prove:
 *   request #1 (pre-expiry) → 200
 *   request #2 (post-expiry) → 401  (session re-auth enforced)
 *
 * A 503 response means the endpoint is disabled on this host — that is
 * the correct production behaviour, and the drill treats it as SKIP,
 * not FAIL.
 */
export async function POST(req: NextRequest) {
  if (process.env.DRILL_MODE !== "true") {
    return NextResponse.json(
      { success: false, error: { code: "DRILL_DISABLED" } },
      { status: 503 },
    );
  }

  const secret = process.env.DRILL_SECRET ?? "";
  const supplied = req.headers.get("x-drill-mode") ?? "";
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { success: false, error: { code: "DRILL_SECRET_MISSING" } },
      { status: 503 },
    );
  }
  if (supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
    return NextResponse.json(
      { success: false, error: { code: "DRILL_SECRET_MISMATCH" } },
      { status: 401 },
    );
  }

  // Invalid/absent JSON is a request validation failure, not a swallowed
  // error: it is converted to a 400 below.
  const body = (await req.json().catch(() => null)) as { userId?: string } | null;
  const userId = body?.userId?.trim();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "userId (UUID) required" } },
      { status: 400 },
    );
  }

  const { rows } = await query<{
    id: string;
    email: string;
    role: string;
    status: string;
    session_version: number | null;
  }>(
    `SELECT id, email, role, status, session_version FROM public.users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json(
      { success: false, error: { code: "USER_NOT_ELIGIBLE" } },
      { status: 404 },
    );
  }
  if (user.role === "admin" || user.role === "sysadmin") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "USER_NOT_ELIGIBLE", message: "drill tokens are non-privileged only" },
      },
      { status: 403 },
    );
  }

  // Sign a 2-second-TTL access token with the production key + kid.
  const iat = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    id: user.id,
    role: user.role,
    email: user.email,
    session_version: user.session_version ?? 0,
    token_type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: getAuthSigningKid() })
    .setSubject(user.id)
    .setJti(randomUUID())
    .setIssuedAt(iat)
    .setExpirationTime(iat + 2)
    .sign(getAuthSigningKey());

  return NextResponse.json({ success: true, token, ttlSeconds: 2 });
}
