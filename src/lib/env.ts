/**
 * Centralized Environment Variable Validation for Self-Hosted Architecture
 * Validates required environment variables at runtime and provides fail-safe defaults.
 */

export interface EnvConfig {
  databaseUrl?: string;
  redisUrl?: string;
  authJwtSecret?: string;
  mobileTokenSecret?: string;
  mfaEnrollSecret?: string;
  allowedOrigin?: string;
  appUrl?: string;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  // Deprecated backward-compatibility aliases
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
}

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const isDevelopment = nodeEnv === "development";
  const isTest = nodeEnv === "test";

  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  const authJwtSecret =
    process.env.AUTH_JWT_SECRET ||
    process.env.MOBILE_TOKEN_SECRET ||
    process.env.JWT_SECRET;
  const mobileTokenSecret = process.env.MOBILE_TOKEN_SECRET || authJwtSecret;
  const mfaEnrollSecret = process.env.MFA_ENROLL_SECRET || authJwtSecret;
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (isProduction && !databaseUrl && !process.env.POSTGRES_PASSWORD) {
    const msg = "[ENV VALIDATION ERROR] Missing required DATABASE_URL or POSTGRES_PASSWORD for PostgreSQL.";
    console.warn(msg);
  }

  cachedEnv = {
    databaseUrl,
    redisUrl,
    authJwtSecret,
    mobileTokenSecret,
    mfaEnrollSecret,
    allowedOrigin,
    appUrl,
    nodeEnv,
    isProduction,
    isDevelopment,
    isTest,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };

  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}

export default getEnv;
