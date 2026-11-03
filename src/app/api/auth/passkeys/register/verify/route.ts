import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";
import { rpID, origin, assertProductionWebAuthnConfig } from "@/lib/webauthn";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(
  req: NextRequest,
  ctx: { auth: AuthContext },
) {
  assertProductionWebAuthnConfig();
  const body = await req.json();
  const store = await cookies();
  const expectedChallenge = store.get("reg_challenge")?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "challenge expired" }, { status: 400 });
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  // v13: credential lives under registrationInfo.credential
  const cred = verification.registrationInfo.credential;
  await query(
    `INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, transports, device_label)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (credential_id) DO NOTHING`,
    [
      ctx.auth.userId,
      cred.id,
      Buffer.from(cred.publicKey).toString("base64url"),
      cred.counter,
      JSON.stringify(body.response?.transports ?? []),
      (body.deviceLabel as string | undefined) ?? "Passkey",
    ],
  );
  store.delete("reg_challenge");
  await addAudit({
    action: "MFA_ENROLLED",
    userId: ctx.auth.userId,
    userName: ctx.auth.email,
    role: ctx.auth.role as Role,
    details: { method: "webauthn" },
  });
  return NextResponse.json({ verified: true });
}

export const POST = withMutationGuard(handlePost);
