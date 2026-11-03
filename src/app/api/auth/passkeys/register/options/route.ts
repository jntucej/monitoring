import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { rpID, rpName, assertProductionWebAuthnConfig } from "@/lib/webauthn";

async function handlePost(req: NextRequest, ctx: { auth: { userId: string; email: string } }) {
  assertProductionWebAuthnConfig();
  const blocked = assertCsrf(req);
  if (blocked) return blocked;
  const { rows } = await query<{ credential_id: string; transports: string[] }>(
    "SELECT credential_id, transports FROM user_passkeys WHERE user_id = $1",
    [ctx.auth.userId],
  );
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: ctx.auth.email,
    userID: new TextEncoder().encode(ctx.auth.userId),
    attestationType: "none",
    excludeCredentials: rows.map((c) => ({
      id: c.credential_id,
      transports: c.transports as Array<"ble" | "nfc" | "internal" | "usb" | "hybrid">,
    })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  const store = await cookies();
  store.set("reg_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 300, // 5 minutes — never localStorage
  });
  return NextResponse.json(options);
}

export const POST = withAuthorization(handlePost);
