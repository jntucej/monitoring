import { SignJWT, jwtVerify, JWTPayload } from "jose";
import bcrypt from "bcryptjs";

const DEFAULT_SECRET = "gate_monitor_production_secret_key_must_be_at_least_32_bytes_long";

export function getAuthSigningKey(): Uint8Array {
  const secret =
    process.env.AUTH_JWT_SECRET ||
    process.env.MOBILE_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    DEFAULT_SECRET;

  return new TextEncoder().encode(secret.padEnd(32, "_"));
}

export interface AuthTokenClaims extends JWTPayload {
  sub: string;
  id?: string;
  email?: string;
  role: string;
  account_status?: string;
  name?: string;
  token_type?: "access" | "refresh";
}

/**
 * Sign an Access Token (1 hour default lifespan)
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
 * Sign a Refresh Token (7 days lifespan)
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
    sub: claims.sub,
    id: claims.sub,
    email: claims.email,
    role: claims.role,
    token_type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiry)
    .sign(key);
}

/**
 * Verify an Access or Refresh Token
 */
export async function verifyAuthToken(token: string): Promise<AuthTokenClaims | null> {
  try {
    const key = getAuthSigningKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as AuthTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

/**
 * Compare plain text password against bcrypt hash
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
