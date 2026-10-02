import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

function getSigningKey(): Uint8Array {
  const secret = getEnv("MOBILE_TOKEN_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("MOBILE_TOKEN_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function generateQrToken(roll: string): Promise<string> {
  return await new SignJWT({ roll, purpose: "qr_verification" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("45s")
    .sign(getSigningKey());
}

export async function validateQrToken(token: string): Promise<string | null> {
  try {
    const payload = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose === "qr_verification" && typeof payload.roll === "string") {
      return payload.roll;
    }
    return null;
  } catch {
    // Validation failed (expired, invalid signature, etc.)
    return null;
  }
}
