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
  // NOTE: deliberately do NOT fall back to MOBILE_TOKEN_SECRET or JWT_SECRET.
  // Each token class must have its own secret.
  return new TextEncoder().encode(requireSecret("AUTH_JWT_SECRET"));
}

export type TokenType = "access" | "refresh";
export type TokenPurpose = "password_reset" | "qr_verification" | "mfa_enroll";

export interface BaseClaims extends JWTPayload {
  sub: string;
}

export interface TypedClaims extends BaseClaims {
  token_type: TokenType;
  [key: string]: unknown;
}

export interface PurposedClaims extends BaseClaims {
  purpose: TokenPurpose | string;
  email?: string;
  [key: string]: unknown;
}

export interface AuthTokenClaims extends BaseClaims {
  id?: string;
  email?: string;
  role: string;
  account_status?: string;
  name?: string;
  token_type?: TokenType | string;
  purpose?: string;
  [key: string]: unknown;
}

/**
 * Sign AccessToken (1 hour default lifespan)
 */
export async function signAccessToken(claims: {
  sub: string;
  email?: string;
  role: string;
  account_status?: string;
  name?: string;
  [key: string]: unknown;
}): Promise<string> {
  const key = getAuthSigningKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiry = issuedAt + 3600; // 1 hour

  return await new SignJWT({
    ...claims,
    id: claims.sub,
    token_type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: "auth-v1" })
    .setSubject(claims.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiry)
    .sign(key);
}

/**
 * Sign RefreshToken (7 days lifespan)
 */
export async function signRefreshToken(claims: {
  sub: string;
  email?: string;
  role: string;
  [key: string]: unknown;
}): Promise<string> {
  const key = getAuthSigningKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiry = issuedAt + 7 * 24 * 3600; // 7 days

  return await new SignJWT({
    ...claims,
    id: claims.sub,
    token_type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: "auth-v1" })
    .setSubject(claims.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiry)
    .sign(key);
}

/**
 * Sign Password ResetToken (1 hour lifespan with dedicated purpose)
 */
export async function signPasswordResetToken(
  userId: string,
  email?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ purpose: "password_reset", email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: "auth-v1" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1 hour
    .sign(getAuthSigningKey());
}

/**
 * The ONE choke-point that touches jwtVerify for auth-secret tokens.
 */
async function verifyWithAuthSecret<T extends BaseClaims>(
  token: string,
  predicate: (p: JWTPayload) => p is T,
  expect: string
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSigningKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    if (!predicate(payload)) {
      // Signature was valid but wrong class — this is the interesting case
      console.warn("[auth] token_class_mismatch", {
        expected: expect,
        got_type: (payload as Record<string, unknown>).token_type ?? (payload as Record<string, unknown>).purpose ?? null,
        sub: payload.sub,
        // do NOT log the token itself
      });
      return null;
    }
    return payload as T;
  } catch {
    return null; // bad signature / expired / malformed — noisy but low-signal
  }
}

export const verifyAccessToken = (t: string) =>
  verifyWithAuthSecret<AuthTokenClaims>(
    t,
    (p): p is AuthTokenClaims => p.token_type === "access",
    "access"
  );

export const verifyRefreshToken = (t: string) =>
  verifyWithAuthSecret<AuthTokenClaims>(
    t,
    (p): p is AuthTokenClaims => p.token_type === "refresh",
    "refresh"
  );

export const verifyPasswordResetToken = (t: string) =>
  verifyWithAuthSecret<PurposedClaims>(
    t,
    (p): p is PurposedClaims => p.purpose === "password_reset",
    "password_reset"
  );

/**
 * @deprecated Never call this directly. See src/lib/auth-token.ts.
 */
export async function verifyAuthToken(): Promise<never> {
  throw new Error(
    "verifyAuthToken was removed to prevent token class confusion. Use verifyAccessToken, verifyRefreshToken, or verifyPasswordResetToken."
  );
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

if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
  const required = ["AUTH_JWT_SECRET", "MOBILE_TOKEN_SECRET", "QR_TOKEN_SECRET", "MFA_ENROLL_SECRET"];
  for (const name of required) {
    const v = process.env[name];
    if (!v || v.length < 32) {
      console.error(`[auth-token:FATAL] ${name} missing or <32 chars — the app will reject all tokens.`);
    }
  }
  const totpKey = process.env.TOTP_ENCRYPTION_KEY;
  if (!totpKey || totpKey.length < 64) {
    console.error("[auth-token:FATAL] TOTP_ENCRYPTION_KEY missing or not 64 hex chars.");
  }
}
