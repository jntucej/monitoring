/**
 * Pre-deploy & Pre-build Environment Validation Script
 * Validates required client and server environment variables before deployment/build.
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

// Load env files if running locally
const rootDir = path.resolve(__dirname, '..');
loadEnvFile(path.join(rootDir, '.env.local'));
loadEnvFile(path.join(rootDir, '.env'));

const REQUIRED_ENV = {
  client: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  server: ['SUPABASE_SERVICE_ROLE_KEY'],
};

const OPTIONAL_WARN_ENV = ['MOBILE_TOKEN_SECRET', 'ALLOWED_ORIGIN', 'UPSTASH_REDIS_REST_URL'];

function validate() {
  console.log('🔍 Running Pre-Deploy Environment Validation...');
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  for (const varName of REQUIRED_ENV.client) {
    if (!process.env[varName]) {
      errors.push(`Missing required client environment variable: ${varName}`);
    }
  }

  for (const varName of REQUIRED_ENV.server) {
    if (!process.env[varName]) {
      if (isProd) {
        errors.push(`Missing required server environment variable in production: ${varName}`);
      } else {
        warnings.push(`Missing server environment variable: ${varName}`);
      }
    }
  }

  for (const varName of OPTIONAL_WARN_ENV) {
    if (!process.env[varName]) {
      warnings.push(`Optional variable not set: ${varName}`);
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Environment Warnings:');
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error('❌ Environment Validation Failed:');
    errors.forEach((e) => console.error(`   - ${e}`));
    if (isProd) {
      process.exit(1);
    }
  } else {
    console.log('✅ Environment Validation Passed!');
  }
}

validate();
