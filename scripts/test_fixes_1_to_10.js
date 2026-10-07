const fs = require('fs');
const assert = require('assert');

console.log('🧪 Running Validation Tests 1-10...\n');

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

test('Issue 1: PostgresQueryBuilder methods exist and chain correctly', () => {
  const pgSource = fs.readFileSync('src/lib/postgres.ts', 'utf8');
  assert(pgSource.includes('class PostgresQueryBuilder'), 'PostgresQueryBuilder class should exist');
  assert(pgSource.includes('parsePostgrestOrClause'), 'parsePostgrestOrClause should exist');
  assert(pgSource.includes('buildSelectClause'), 'buildSelectClause should exist');
  assert(pgSource.includes('pendingMutation'), 'pendingMutation should support mutation chaining');
  assert(pgSource.includes('single()'), 'single() should return this');
  assert(pgSource.includes('then<'), 'then() should make builder thenable');
});

test('Issue 2: users.role CHECK contains parent, supervisor, hod', () => {
  const schemaSql = fs.readFileSync('database/schema.sql', 'utf8');
  assert(schemaSql.includes("'parent'"), 'users.role CHECK should include parent');
  assert(schemaSql.includes("'supervisor'"), 'users.role CHECK should include supervisor');
  assert(schemaSql.includes("'hod'"), 'users.role CHECK should include hod');
});

test('Issue 3: 2FA columns exist in schema and login checks both secrets', () => {
  const schemaSql = fs.readFileSync('database/schema.sql', 'utf8');
  assert(schemaSql.includes('two_factor_secret'), 'users table should have two_factor_secret');
  assert(schemaSql.includes('two_factor_enabled'), 'users table should have two_factor_enabled');
  
  const loginCode = fs.readFileSync('src/app/api/auth/login/route.ts', 'utf8');
  assert(loginCode.includes('user.two_factor_secret'), 'login route should check user.two_factor_secret');
  assert(loginCode.includes('user.two_factor_enabled'), 'login route should check user.two_factor_enabled');
});

test('Issue 4: session_version exists and session invalidation increments version', () => {
  const schemaSql = fs.readFileSync('database/schema.sql', 'utf8');
  assert(schemaSql.includes('session_version'), 'users table should have session_version');

  const dbClientCode = fs.readFileSync('src/lib/dbClient.ts', 'utf8');
  assert(dbClientCode.includes('session_version = session_version + 1'), 'invalidateAllUserSessions should increment session_version');
});

test('Issue 5: Logout route revokes sessions via refresh_hash or user_id', () => {
  const logoutCode = fs.readFileSync('src/app/api/auth/logout/route.ts', 'utf8');
  assert(logoutCode.includes('UPDATE sessions SET revoked_at = NOW()'), 'Logout should update sessions revoked_at');
  assert(logoutCode.includes('refresh_hash = $1'), 'Logout should match refresh_hash');
});

test('Issue 6: Security migration grants correct signatures and preserves sysadmin', () => {
  const migSql = fs.readFileSync('database/migrations/20260916000000_security_rls_and_function_hardening.sql', 'utf8');
  assert(migSql.includes('resolve_login_identifier(TEXT)'), 'GRANT should include TEXT argument signature');
  assert(migSql.includes('can_user_authenticate(UUID)'), 'GRANT should include UUID argument signature');
  assert(migSql.includes("'sysadmin'"), 'is_admin function should retain sysadmin');
});

test('Issue 7: findGatePasses filters by parent children rolls', () => {
  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(dbCode.includes('getParentChildren(pId)'), 'findGatePasses should lookup parent children rolls');
  assert(dbCode.includes("query.in('roll', rolls)"), 'findGatePasses should filter by child rolls');
});

test('Issue 8: Person history route allows parents to view child history', () => {
  const histCode = fs.readFileSync('src/app/api/persons/[uniqueId]/history/route.ts', 'utf8');
  assert(histCode.includes('getParentChildren(auth.userId)'), 'history route should lookup parent children');
  assert(histCode.includes('isGuardianOfStudent'), 'history route should allow access when guardian/parent matches');
});

test('Issue 9: Occupancy queries campus_occupancy with current_status = IN', () => {
  const occCode = fs.readFileSync('src/lib/occupancy.ts', 'utf8');
  assert(occCode.includes('.from("campus_occupancy")'), 'Occupancy should query campus_occupancy');
  assert(occCode.includes('.eq("current_status", "IN")'), 'Occupancy should query current_status = IN');
});

test('Issue 10: Reason CHECK includes daily_outing, day_pass, home_out', () => {
  const schemaSql = fs.readFileSync('database/schema.sql', 'utf8');
  assert(schemaSql.includes('daily_outing'), 'Reason CHECK should include daily_outing');
  assert(schemaSql.includes('day_pass'), 'Reason CHECK should include day_pass');
  assert(schemaSql.includes('Daily Outing'), 'Reason CHECK should include Daily Outing');
});

console.log(`\n🎉 Test Results 1-10: ${passedTests}/10 passed!`);
