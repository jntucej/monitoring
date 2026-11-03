import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { rpID, origin, assertProductionWebAuthnConfig } from "@/lib/webauthn";
import { signAccessToken, signRefreshToken } from "@/lib/auth-token";
import { secureCookieOptions } from "@/lib/cookies";
import { addAudit } from "@/lib/db";
import { randomUUID } from "crypto";

async function handlePost(req: NextRequest) {
  assertProductionWebAuthnConfig();
  const body = await req.json();
  const store = await cookies();
  const expectedChallenge = store.get("auth_challenge")?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "challenge expired" }, { status: 400 });
  }

  // L1g: the challenge may also be supplied by the login route (mfa_challenges
  // table, one-use, consumed atomically). Accept either source; the DB
  // challenge takes precedence when present.
  const mfaChallengeId: string | undefined = body.mfaChallenge;
  let mfaUserId: string | null = null;
  if (mfaChallengeId) {
    const chRes = await query<{ user_id: string }>(
      `UPDATE mfa_challenges
       SET consumed_at = NOW()
       WHERE id = $1 AND user_id IS NOT NULL AND consumed_at IS NULL
         AND expires_at > NOW()
       RETURNING user_id`,
      [mfaChallengeId],
    );
    if (chRes.rows.length === 0) {
      return NextResponse.json({ error: "challenge invalid or expired" }, { status: 400 });
    }
    mfaUserId = chRes.rows[0].user_id;
  }

  const { rows } = await query<{
    id: string;
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: string;
    transports: string[];
  }>(
    mfaUserId
      ? "SELECT id, user_id, credential_id, public_key, counter, transports FROM user_passkeys WHERE credential_id = $1 AND user_id = $2"
      : "SELECT id, user_id, credential_id, public_key, counter, transports FROM user_passkeys WHERE credential_id = $1",
    mfaUserId ? [body.id, mfaUserId] : [body.id],
  );
  if (!rows.length) {
    return NextResponse.json({ error: "unknown credential" }, { status: 404 });
  }
  const dbCred = rows[0];

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: dbCred.credential_id,
      publicKey: new Uint8Array(Buffer.from(dbCred.public_key, "base64url")),
      counter: Number(dbCred.counter),
      transports: dbCred.transports as Array<"ble" | "nfc" | "internal" | "usb" | "hybrid">,
    },
    requireUserVerification: false,
  });
  if (!verification.verified) {
    return NextResponse.json({ verified: false }, { status: 401 });
  }

  await query(
    "UPDATE user_passkeys SET counter = $1, last_used_at = NOW() WHERE credential_id = $2",
    [verification.authenticationInfo.newCounter, dbCred.credential_id],
  );

  const { rows: users } = await query<{
    id: string;
    email: string;
    role: string;
    name: string;
    status: string;
  }>(
    "SELECT id, email, role, name, status FROM users WHERE id = $1 AND status = 'ACTIVE'",
    [dbCred.user_id],
  );
  if (!users.length) {
    return NextResponse.json({ error: "inactive" }, { status: 403 });
  }
  const u = users[0];

  await addAudit({
    action: "MFA_VERIFIED",
    userId: u.id,
    userName: u.email,
    role: u.role as import("@/lib/types").Role,
    details: { method: "webauthn", credentialId: dbCred.credential_id },
  });

  const access = await signAccessToken({
    sub: u.id,
    email: u.email,
    role: u.role,
    name: u.name,
    mfa: true,
  });
  const refresh = await signRefreshToken({ sub: u.id, email: u.email, role: u.role });
  const res = NextResponse.json({
    success: true,
    data: {
      token: access,
      refreshToken: refresh,
      user: { id: u.id, role: u.role, name: u.name },
    },
  });
  res.cookies.set(
    "access_token",
    access,
    secureCookieOptions(req, { httpOnly: true, sameSite: "strict", maxAge: 900 }),
  );
  res.cookies.set(
    "refresh_token",
    refresh,
    secureCookieOptions(req, { httpOnly: true, sameSite: "strict", maxAge: 604800 }),
  );
  store.delete("auth_challenge");
  return res;
}

export const POST = withRateLimit(handlePost, {
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: "passkey-auth",
});
