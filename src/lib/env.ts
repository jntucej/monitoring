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

  return cachedEnv;
}
