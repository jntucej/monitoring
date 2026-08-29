/**
 * Centralized Environment Variable Validation
 * Validates required environment variables at runtime and provides fail-safe defaults or clear error reporting.
 */

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string | null;
  mobileTokenSecret: string | null;
  mfaEnrollSecret: string | null;
  allowedOrigin: string;
  isProduction: boolean;
}

let validatedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (validatedEnv) return validatedEnv;

  const isProduction = process.env.NODE_ENV === 'production';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
  const mobileTokenSecret = process.env.MOBILE_TOKEN_SECRET || null;
  const mfaEnrollSecret = process.env.MFA_ENROLL_SECRET || process.env.MOBILE_TOKEN_SECRET || null;
  const allowedOrigin =
    process.env.ALLOWED_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (isProduction ? '' : '*');

  const missingClient: string[] = [];
  if (!supabaseUrl) missingClient.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingClient.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missingClient.length > 0) {
    const msg = `[ENV VALIDATION ERROR] Missing client environment variables: ${missingClient.join(', ')}`;
    if (typeof window === 'undefined' && isProduction) {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }

  validatedEnv = {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    mobileTokenSecret,
    mfaEnrollSecret,
    allowedOrigin,
    isProduction,
  };

  return validatedEnv;
}

export function validateServerEnv(): void {
  const env = getEnv();
  const missingServer: string[] = [];

  if (!env.supabaseServiceRoleKey) missingServer.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!env.mobileTokenSecret) missingServer.push('MOBILE_TOKEN_SECRET');

  if (missingServer.length > 0) {
    const msg = `[ENV SERVER VALIDATION WARNING] Missing critical server environment variables: ${missingServer.join(', ')}`;
    if (env.isProduction) {
      console.error(msg);
    } else {
      console.warn(msg);
    }
  }
}
