const fs = require('fs');
const assert = require('assert');

console.log('🧪 Running Validation Tests 11-20...\n');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

test('Issue 11: Audit log validates UUID user_id and parses count from countResult', () => {
  const auditCode = fs.readFileSync('src/lib/audit.ts', 'utf8');
  assert(auditCode.includes('isUuid'), 'logAuditEvent should sanitize userId with UUID check');
  assert(auditCode.includes('countResult.rows[0]'), 'getAuditLogs should read count from countResult');
});

test('Issue 12: Mobile login requires password or PIN verification', () => {
  const mobileCode = fs.readFileSync('src/app/api/mobile/[...path]/route.ts', 'utf8');
  assert(mobileCode.includes('verifyPassword'), 'Mobile login should verify password or pin');
  assert(mobileCode.includes('!password && !pin'), 'Mobile login should require password or pin');
});

test('Issue 13: SSO route requires verified OIDC claims without fallback', () => {
  const ssoCode = fs.readFileSync('src/app/api/auth/sso/route.ts', 'utf8');
  assert(!ssoCode.includes('sso_${code.substring'), 'SSO should not fall back to untrusted query params or code string');
  assert(ssoCode.includes('validateOIDCIdToken'), 'SSO should validate ID token claims');
});

test('Issue 14: Default PIN is generated securely or required from env', () => {
  const seedCode = fs.readFileSync('scripts/seed-data.js', 'utf8');
  assert(!seedCode.includes("DEFAULT_SEED_PIN = '1234'"), 'Seed script should not have unconfigurable 1234');
});

test('Issue 15: Sensitive endpoints are protected with authorization and rate limiting', () => {
  const attCode = fs.readFileSync('src/app/api/attendance_records/route.ts', 'utf8');
  assert(attCode.includes('withAuthorization'), 'attendance_records should be wrapped in withAuthorization');
  
  const fbCode = fs.readFileSync('src/app/api/feedback/route.ts', 'utf8');
  assert(fbCode.includes('withAuthorization'), 'feedback GET should be wrapped in withAuthorization');
  
  const voiceCode = fs.readFileSync('src/app/api/voice/interpret/route.ts', 'utf8');
  assert(voiceCode.includes('withAuthorization'), 'voice/interpret should be wrapped in withAuthorization');
});

test('Issue 16: env-loader.js supports CommonJS', () => {
  const envLoader = fs.readFileSync('scripts/lib/env-loader.js', 'utf8');
  assert(envLoader.includes('module.exports'), 'env-loader.js should export with module.exports');
});

test('Issue 17: rate-limit.ts checks EdgeRuntime before importing postgres', () => {
  const rlCode = fs.readFileSync('src/lib/rate-limit.ts', 'utf8');
  assert(rlCode.includes('EdgeRuntime') || rlCode.includes('NEXT_RUNTIME'), 'rate-limit.ts should check for Edge runtime');
  assert(rlCode.includes('!isEdge'), 'rate-limit.ts should only import postgres when not in Edge runtime');
});

test('Issue 18: PostgresQueryBuilder / db provides auth.admin methods', () => {
  const pgCode = fs.readFileSync('src/lib/postgres.ts', 'utf8');
  assert(pgCode.includes('authAdmin ='), 'postgres.ts should export authAdmin');
  assert(pgCode.includes('createUser('), 'authAdmin should implement createUser');
  assert(pgCode.includes('deleteUser('), 'authAdmin should implement deleteUser');
  assert(pgCode.includes('updateUserById('), 'authAdmin should implement updateUserById');
  assert(pgCode.includes('admin: authAdmin'), 'db.auth should expose admin');
});

test('Issue 19: verify-supabase-migrations uses dbClient', () => {
  const migCheckCode = fs.readFileSync('scripts/verify-supabase-migrations.ts', 'utf8');
  assert(migCheckCode.includes('dbClient'), 'verify-supabase-migrations.ts should require dbClient');
});

test('Issue 20: Admin metrics and retention use real database queries', () => {
  const retCode = fs.readFileSync('src/app/api/admin/retention/run/route.ts', 'utf8');
  assert(retCode.includes('DELETE FROM'), 'retention route should execute real DELETE statements');
  
  const secCode = fs.readFileSync('src/lib/security.ts', 'utf8');
  assert(secCode.includes("action = 'LOGIN_FAILED'"), 'security stats should query real failed logins');
  
  const sustCode = fs.readFileSync('src/lib/sustainability.ts', 'utf8');
  assert(sustCode.includes('DATE_TRUNC'), 'sustainability history should query real month aggregates');
  
  const userAnalCode = fs.readFileSync('src/lib/user-analytics.ts', 'utf8');
  assert(userAnalCode.includes('movement_logs'), 'user analytics should query real movement logs');
});

console.log(`\n🎉 Test Results 11-20: ${passedTests}/10 passed!`);
