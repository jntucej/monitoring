import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

const DEV_FALLBACK_QR = "dev-only-insecure-qr-secret-32bytes-min";

export function getSigningKey(): Uint8Array {
  const env = getEnv();
  const secret =
    process.env.QR_TOKEN_SECRET ||
    env.qrTokenSecret ||
    (env.isProduction ? null : DEV_FALLBACK_QR);
  if (!secret || secret.length < 32) {
    throw new Error(
      "[qr-token] QR_TOKEN_SECRET must be configured (>= 32 chars) in production."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function generateQrToken(roll: string): Promise<string> {
  return await new SignJWT({ roll, purpose: "qr_verification", token_type: "qr" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("45s")
    .sign(getSigningKey());
}

export async function validateQrToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
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
