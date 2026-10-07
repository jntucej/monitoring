import { SignJWT, jwtVerify, JWTPayload } from "jose";
import bcrypt from "bcryptjs";

const DEV_FALLBACK = "dev-only-insecure-secret-change-me-32bytes-min";

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed: never sign/verify with a guessable secret in prod.
      throw new Error(
        `[auth-token] ${name} is missing or shorter than 32 chars. Refusing to process tokens. Set ${name} in the deployment environment.`
      );
    }
    console.warn(`[auth-token] ${name} not set; using INSECURE dev fallback.`);
    return DEV_FALLBACK;
  }
  return value;
}

export function getAuthSigningKey(): Uint8Array {
  // NOTE: deliberately does NOT fall back to MOBILE_TOKEN_SECRET or JWT_SECRET.
  // Each token class must have its own secret.
  return new TextEncoder().encode(requireSecret("AUTH_JWT_SECRET"));
}

export type TokenType = "access" | "refresh";

export interface AuthTokenClaims extends JWTPayload {
  sub: string;
  id?: string;
  email?: string;
  role: string;
  account_status?: string;
  name?: string;
  token_type?: TokenType | string;
  purpose?: string;
}

/**
 * Sign Access Token (1 hour default lifespan)
 */
export async function signAccessToken(claims: {
  sub: string;
  email?: string;
  role: string;
  account_status?: string;
  name?: string;
  [key: string]: any;
}): Promise<string> {
  const key = getAuthSigningKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiry = issuedAt + 3600; // 1 hour

  return await new SignJWT({
    ...claims,
    id: claims.sub,
    token_type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiry)
    .sign(key);
}

/**
 * Sign Refresh Token (7 days lifespan)
 */
export async function signRefreshToken(claims: {
  sub: string;
  email?: string;
  role: string;
  [key: string]: any;
}): Promise<string> {
  const key = getAuthSigningKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiry = issuedAt + 7 * 24 * 3600; // 7 days

  return await new SignJWT({
    ...claims,
    id: claims.sub,
    token_type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiry)
    .sign(key);
}

/**
 * Sign Password Reset Token (1 hour lifespan with dedicated purpose)
 */
export async function signPasswordResetToken(
  userId: string,
  email?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ purpose: "password_reset", email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1 hour
    .sign(getAuthSigningKey());
}

/**
 * Internal typed verification helper
 */
async function verifyTyped(
  token: string,
  expected: TokenType
): Promise<AuthTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSigningKey(), {
      algorithms: ["HS256"],
    });
    if (payload.token_type !== expected) return null;
    if (typeof payload.sub !== "string") return null;
    return payload as AuthTokenClaims;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (t: string) => verifyTyped(t, "access");
export const verifyRefreshToken = (t: string) => verifyTyped(t, "refresh");

/**
 * Verify dedicated password reset token
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSigningKey(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== "password_reset" || typeof payload.sub !== "string") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Backward compatibility alias for verifyAccessToken
 */
export async function verifyAuthToken(
  token: string
): Promise<AuthTokenClaims | null> {
  return verifyAccessToken(token);
}

/**
 * Hash plain text password using bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

/**
 * Compare plain text password against bcrypt hash
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
