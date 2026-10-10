/**
 * Centralized Environment Configuration & Validation
 * Provides typed access to required application environment variables.
 */

export interface EnvConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  databaseUrl?: string;
  redisUrl?: string;
  authJwtSecret?: string;
  mobileTokenSecret?: string;
  qrTokenSecret?: string;
  mfaEnrollSecret?: string;
  allowedOrigin?: string;
}

const DEV_FALLBACKS: Record<string, string> = {
  AUTH_JWT_SECRET: "dev-only-insecure-secret-change-me-32bytes-min",
  MOBILE_TOKEN_SECRET: "dev-only-insecure-mobile-secret-32bytes-min",
  QR_TOKEN_SECRET: "dev-only-insecure-qr-secret-32bytes-min",
  MFA_ENROLL_SECRET: "dev-only-insecure-mfa-secret-32bytes-min",
  TOTP_ENCRYPTION_KEY: "dev-insecure-totp-key-change-me-0000000000000000000000000000000000000000",
};

const secretCache = new Map<string, string>();

export function requireSecret(name: string, minLen = 32): string {
  const cached = secretCache.get(name);
  if (cached) return cached;

  const v = process.env[name];
  if (!v || v.length < minLen) {
    const env = process.env.NODE_ENV;
    if (env && env !== "development" && env !== "test") {
      throw new Error(`[env] ${name} missing or < ${minLen} chars. Refusing to start in ${env}.`);
    }
    console.warn(`[env] ${name} not set; using INSECURE dev fallback.`);
    const fallback = DEV_FALLBACKS[name] || "dev-fallback-insecure-key-change-me!";
    secretCache.set(name, fallback);
    return fallback;
  }
  secretCache.set(name, v);
  return v;
}

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const isDevelopment = nodeEnv === "development";
  const isTest = nodeEnv === "test";

  const databaseUrl =
    process.env.DATABASE_URL ||
    (process.env.POSTGRES_DB && process.env.POSTGRES_PASSWORD
      ? `postgres://${process.env.POSTGRES_USER || "postgres"}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST || "postgres"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB}`
      : undefined);

  const redisUrl = process.env.REDIS_URL;
  const authJwtSecret = process.env.AUTH_JWT_SECRET;
  const mobileTokenSecret = process.env.MOBILE_TOKEN_SECRET;
  const qrTokenSecret = process.env.QR_TOKEN_SECRET;
  const mfaEnrollSecret = process.env.MFA_ENROLL_SECRET;
  const allowedOrigin = process.env.ALLOWED_ORIGIN;

  cachedEnv = {
    isProduction,
    isDevelopment,
    isTest,
    databaseUrl,
    redisUrl,
    authJwtSecret,
    mobileTokenSecret,
    qrTokenSecret,
    mfaEnrollSecret,
    allowedOrigin,
  };

  // Critical Boot Check
  const REQUIRED_SECRETS = ['QR_TOKEN_SECRET', 'AUTH_JWT_SECRET', 'MOBILE_TOKEN_SECRET', 'MFA_ENROLL_SECRET'];
  if (process.env.NODE_ENV === 'production') {
    for (const key of REQUIRED_SECRETS) {
      const v = process.env[key];
      if (!v || v.length < 32) {
        throw new Error(`FATAL: ${key} must be set to >=32 chars in production`);
      }
    }
  }

  return cachedEnv;
}
