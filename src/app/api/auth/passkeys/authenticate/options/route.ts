import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID, assertProductionWebAuthnConfig } from "@/lib/webauthn";

export async function POST() {
  assertProductionWebAuthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    // allowCredentials empty → discoverable (usernameless) sign-in
  });
  const store = await cookies();
  store.set("auth_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
  return NextResponse.json(options);
}
