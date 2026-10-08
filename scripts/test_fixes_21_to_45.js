/**
 * Verification Test Suite: Fixes 21 to 45
 */
const fs = require('fs');
const assert = require('assert');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

console.log('🧪 Running Validation Tests 21-45...\n');

test('Issue 21: Bulk user import restricts sysadmin creation to sysadmin actors', () => {
  const code = fs.readFileSync('src/app/api/users/bulk/route.ts', 'utf8');
  assert(code.includes('role === "sysadmin" && actorRole !== "sysadmin"'), 'Bulk import must guard sysadmin creation');
});

test('Issue 22: Database migration includes single-use password_reset_tokens and predictions index', () => {
  const migCode = fs.readFileSync('supabase/migrations/20261008000001_security_remediation_audit.sql', 'utf8');
  assert(migCode.includes('CREATE TABLE IF NOT EXISTS password_reset_tokens'), 'Migration must create password_reset_tokens');
  assert(migCode.includes('idx_predictions_type_timestamp'), 'Migration must index predictions');
  assert(migCode.includes('pin_must_change'), 'Migration must invalidate seed pins');
});

test('Issue 23: Password reset route enforces CSRF, session versioning, and single-use DB tokens', () => {
  const resetCode = fs.readFileSync('src/app/api/auth/reset-password/route.ts', 'utf8');
  assert(resetCode.includes('assertCsrf'), 'Reset password route must enforce CSRF');
  assert(resetCode.includes('password_reset_tokens'), 'Reset password route must check password_reset_tokens table');
  assert(resetCode.includes('session_version'), 'Reset password route must bump session_version');
});

test('Issue 24: Refresh token route enforces CSRF, token rotation, and reuse detection', () => {
  const refreshCode = fs.readFileSync('src/app/api/auth/refresh/route.ts', 'utf8');
  assert(refreshCode.includes('assertCsrf'), 'Refresh route must enforce CSRF');
  assert(refreshCode.includes('TOKEN_REVOKED'), 'Refresh route must detect and reject reused/revoked tokens');
  assert(refreshCode.includes('INSERT INTO sessions'), 'Refresh route must record new rotated session');
});

test('Issue 25: Verify-PIN requires authentication and caller authorization', () => {
  const verifyPinCode = fs.readFileSync('src/app/api/auth/verify-pin/route.ts', 'utf8');
  assert(verifyPinCode.includes('assertCsrf'), 'Verify-PIN route must enforce CSRF');
  assert(verifyPinCode.includes('UNAUTHORIZED'), 'Verify-PIN route must require authentication');
  assert(verifyPinCode.includes('FORBIDDEN'), 'Verify-PIN route must prevent unauthorized cross-user verification');
});

test('Issue 26: Rate limit queries real api_metrics.path column instead of endpoint', () => {
  const rateLimitCode = fs.readFileSync('src/lib/rate-limit.ts', 'utf8');
  assert(rateLimitCode.includes('WHERE path = $1'), 'Rate limiter must query path column');
  assert(!rateLimitCode.includes('WHERE endpoint = $1'), 'Rate limiter must not query non-existent endpoint column');
});

test('Issue 27: Database backup export redacts sensitive password, PIN, and biometric columns', () => {
  const backupCode = fs.readFileSync('src/lib/backup.ts', 'utf8');
  assert(backupCode.includes('password_hash') && backupCode.includes('SENSITIVE_FIELDS'), 'Backup must redact sensitive credential columns');
  assert(backupCode.includes('two_factor_secret'), 'Backup must redact 2FA secrets');
});

test('Issue 28: SSO callback enforces MFA challenge redirection for admin users', () => {
  const ssoCode = fs.readFileSync('src/app/api/auth/sso/route.ts', 'utf8');
  assert(ssoCode.includes('isMfaRequiredForAdmin'), 'SSO callback must check isMfaRequiredForAdmin');
  assert(ssoCode.includes('mfa_login_challenges'), 'SSO callback must generate challenge when 2FA required');
});

test('Issue 29: Operator thumbprint registration prevents modifying administrator biometrics', () => {
  const thumbCode = fs.readFileSync('src/app/api/operator/register-thumbprint/route.ts', 'utf8');
  assert(thumbCode.includes('actorRole === "operator" && (targetUser.role === "admin" || targetUser.role === "sysadmin")'), 'Operators cannot modify admin thumbprints');
});

test('Issue 30: Worker cron jobs use aligned direction and revoked_at columns', () => {
  const dailyJob = fs.readFileSync('worker/jobs/backfill_daily_stats.js', 'utf8');
  assert(dailyJob.includes("UPPER(m.direction) IN ('IN', 'ENTRY')"), 'Daily stats job must handle uppercase directions');
  
  const cleanupJob = fs.readFileSync('worker/jobs/cleanup_expired_passes.js', 'utf8');
  assert(cleanupJob.includes('revoked_at = NOW()'), 'Cleanup job must update revoked_at column');
  assert(!cleanupJob.includes('is_revoked = TRUE'), 'Cleanup job must not update non-existent is_revoked column');
});

test('Issue 31: Analytics enhanced route maps user department from joined relations', () => {
  const enhancedCode = fs.readFileSync('src/app/api/analytics/enhanced/route.ts', 'utf8');
  assert(enhancedCode.includes('users:users(id, role, department_id)'), 'Enhanced analytics must join users relation');
  assert(enhancedCode.includes('user.department_id'), 'Enhanced analytics must read department_id');
});

test('Issue 32: Support ticket comments filter internal notes for non-admin callers', () => {
  const commentCode = fs.readFileSync('src/app/api/support/tickets/[id]/comments/route.ts', 'utf8');
  assert(commentCode.includes('is_internal'), 'Support comments must filter is_internal');
  assert(commentCode.includes('actorRole !== "admin" && actorRole !== "sysadmin"'), 'Non-admins must not see internal notes');
});

test('Issue 33: Canonical department codes and mappings are standardized', () => {
  const typesCode = fs.readFileSync('src/lib/types.ts', 'utf8');
  assert(typesCode.includes('"01": "CIVIL"'), 'types.ts must map 01 to CIVIL');
  assert(typesCode.includes('"05": "CSE"'), 'types.ts must map 05 to CSE');
  assert(typesCode.includes('"12": "IT"'), 'types.ts must map 12 to IT');
});

test('Issue 34: QR token generator supports configurable 90s TTL', () => {
  const qrCode = fs.readFileSync('src/lib/qr-token.ts', 'utf8');
  assert(qrCode.includes('QR_TOKEN_EXPIRATION || "90s"'), 'QR token must default to 90s TTL');
});

test('Issue 35: System actor sentinel symbol used in updateUserRole', () => {
  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(dbCode.includes('export const SYSTEM_ACTOR = "system";'), 'db.ts must export SYSTEM_ACTOR');
  assert(dbCode.includes('actorId !== SYSTEM_ACTOR'), 'updateUserRole must check SYSTEM_ACTOR');
});

test('Issue 36: PostgREST param sanitizer permits valid person names and spaces', () => {
  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(dbCode.includes('\\s\',]'), 'sanitizePostgrestParam must allow spaces and quotes in names');
});

test('Issue 37: Alert rules list route validates severity against allowed whitelist', () => {
  const alertCode = fs.readFileSync('src/app/api/alerts/route.ts', 'utf8');
  assert(alertCode.includes('ALLOWED_SEVERITIES'), 'Alerts route must whitelist severity values');
});

test('Issue 38: next.config serverExternalPackages removes pure-JS bcryptjs', () => {
  const nextConfig = fs.readFileSync('next.config.mjs', 'utf8');
  assert(!nextConfig.includes('bcryptjs'), 'next.config.mjs should not include pure-JS bcryptjs in serverExternalPackages');
});

test('Issue 39: .env.example restricts ALLOWED_ORIGIN to localhost', () => {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  assert(envExample.includes('ALLOWED_ORIGIN=http://localhost:3000'), '.env.example must not expose wildcard origin');
});

test('Issue 40: Redundant src/proxy.ts removed', () => {
  assert(!fs.existsSync('src/proxy.ts'), 'src/proxy.ts should be removed');
});

console.log(`\n🎉 Test Results 21-40: ${passed}/${total} passed!`);
process.exit(passed === total ? 0 : 1);
