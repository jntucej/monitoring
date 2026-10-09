/**
 * Pre-deploy / Pre-build Environment Validation Script
 * Validates required self-hosted database, cache, and token secrets before build/deployment.
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[match[1]] = val;
    }
  }
}

// Load env files when running locally
const rootDir = path.resolve(__dirname, '..');
loadEnvFile(path.join(rootDir, '.env.local'));
loadEnvFile(path.join(rootDir, '.env'));

function validate() {
  console.log('🔍 Running Pre-Deploy Environment Validation...');
  if (process.env.SKIP_ENV_VALIDATION === '1' || process.env.SKIP_ENV_VALIDATION === 'true') {
    console.log('⚡ SKIP_ENV_VALIDATION is enabled — skipping build-time environment variable assertions.\n');
    return;
  }
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // Self-hosted required database configuration
  const hasDb = process.env.DATABASE_URL || (process.env.POSTGRES_DB && process.env.POSTGRES_PASSWORD);
  if (!hasDb) {
    if (isProd) {
      errors.push('Missing required database configuration: Set DATABASE_URL or (POSTGRES_DB and POSTGRES_PASSWORD)');
    } else {
      warnings.push('DATABASE_URL is not set (will default to postgres://postgres:postgres@127.0.0.1:5432/gate_monitor)');
    }
  }

  const isPlaceholder = (val) => {
    if (!val || typeof val !== 'string') return false;
    const lower = val.toLowerCase();
    return (
      lower.includes('change_me') ||
      lower.includes('changeme') ||
      lower.includes('placeholder') ||
      lower.includes('your_') ||
      lower.includes('example') ||
      lower.startsWith('change_me_to_')
    );
  };

  // Token secret
  const authSecret = process.env.AUTH_JWT_SECRET;
  if (!authSecret || authSecret.length < 32) {
    if (isProd) {
      errors.push('AUTH_JWT_SECRET is required and must be at least 32 characters in production (e.g. openssl rand -base64 48).');
    } else {
      warnings.push('AUTH_JWT_SECRET not set or shorter than 32 chars (using dev fallback).');
    }
  } else if (isProd && isPlaceholder(authSecret)) {
    errors.push('AUTH_JWT_SECRET contains an unconfigured placeholder value. You must generate a secure cryptographically random secret.');
  }

  const mobileSecret = process.env.MOBILE_TOKEN_SECRET;
  if (isProd && mobileSecret && isPlaceholder(mobileSecret)) {
    errors.push('MOBILE_TOKEN_SECRET contains an unconfigured placeholder value.');
  }

  const qrSecret = process.env.QR_TOKEN_SECRET;
  if (isProd && qrSecret && isPlaceholder(qrSecret)) {
    errors.push('QR_TOKEN_SECRET contains an unconfigured placeholder value.');
  }

  const mfaSecret = process.env.MFA_ENROLL_SECRET;
  if (isProd && mfaSecret && isPlaceholder(mfaSecret)) {
    errors.push('MFA_ENROLL_SECRET contains an unconfigured placeholder value.');
  }

  // Cache configuration
  // MFA posture — must be an explicit, auditable deployment decision in prod
  // (Issue #5 §4.1: refuse to start with an ambiguous posture).
  const mfaExplicit = process.env.MFA_REQUIRED_FOR_ADMIN;
  if (isProd && mfaExplicit !== "true" && mfaExplicit !== "false") {
    errors.push("MFA_REQUIRED_FOR_ADMIN must be explicitly set to 'true' or 'false' in production. Refusing to start with an ambiguous posture.");
  }

  const totpKey = process.env.TOTP_ENCRYPTION_KEY;
  if (isProd && (!totpKey || totpKey.length < 64)) {
    warnings.push("TOTP_ENCRYPTION_KEY not set or shorter than 64 hex chars in production (2FA setup will fail until set).");
  }

  if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push('REDIS_URL is not set (cache manager will operate in in-memory mode)');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Environment Warnings:');
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment Validation Failed:');
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error('\nPlease set the required environment variables in .env or your deployment environment.\n');
    process.exit(1);
  }

  console.log('\n✅ Environment Validation Passed!\n');
}

validate();
