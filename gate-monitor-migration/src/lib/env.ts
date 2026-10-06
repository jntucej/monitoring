/**
 * Centralized Environment Variable Validation
 * Validates required environment variables for self-hosted deployment
 */

export interface EnvConfig {
  // Database (self-hosted PostgreSQL)
  postgresUrl: string;
  postgresUser: string;
  postgresPassword: string;
  postgresDatabase: string;
  
  // Redis (self-hosted)
  redisUrl: string;
  redisPassword: string;
  
  // Application
  jwtSecret: string;
  appUrl: string;
  nodeEnv: string;
  isProduction: boolean;
  
  // Legacy (kept for backward compatibility during migration)
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string | null;
  mobileTokenSecret: string | null;
}

let validatedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (validatedEnv) return validatedEnv;
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Self-hosted PostgreSQL configuration
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  const postgresUser = process.env.POSTGRES_USER || 'postgres';
  const postgresPassword = process.env.POSTGRES_PASSWORD || '';
  const postgresDatabase = process.env.POSTGRES_DB || 'gate_monitor';
  
  // Self-hosted Redis configuration
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD || '';
  
  // Application secrets
  const jwtSecret = process.env.JWT_SECRET || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Legacy Supabase (kept for transition period)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
  const mobileTokenSecret = process.env.MOBILE_TOKEN_SECRET || process.env.JWT_SECRET || null;
  
  // Validation
  const missing: string[] = [];
  
  if (!postgresUrl) missing.push('POSTGRES_URL / DATABASE_URL');
  if (!postgresPassword) missing.push('POSTGRES_PASSWORD');
  if (!jwtSecret) missing.push('JWT_SECRET');
  
  if (missing.length > 0) {
    const msg = `[ENV VALIDATION ERROR] Missing required environment variables: ${missing.join(', ')}`;
    if (isProduction) {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }
  
  validatedEnv = {
    postgresUrl,
    postgresUser,
    postgresPassword,
    postgresDatabase,
    redisUrl,
    redisPassword,
    jwtSecret,
    appUrl,
    nodeEnv,
    isProduction,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    mobileTokenSecret,
  };
  
  return validatedEnv;
}

export function validateServerEnv(): void {
  const env = getEnv();
  const missing: string[] = [];
  
  if (!env.postgresUrl) missing.push('POSTGRES_URL');
  if (!env.postgresPassword) missing.push('POSTGRES_PASSWORD');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  
  if (missing.length > 0) {
    const msg = `[ENV SERVER VALIDATION ERROR] Missing critical server environment variables: ${missing.join(', ')}`;
    if (env.isProduction) {
      console.error(msg);
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }
}