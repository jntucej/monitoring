const fs = require('fs');
const assert = require('assert');

console.log('🧪 Running Validation Tests for High-Priority Schema Mismatches (Issues 6-17)...\n');

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

test('Issue 6: student-rules reads/writes system_config', () => {
  const code = fs.readFileSync('src/app/api/config/student-rules/route.ts', 'utf8');
  assert(!code.includes('campus_settings'), 'Should not reference campus_settings');
  assert(code.includes('.from("system_config")'), 'Should query system_config');
});

test('Issue 7: onboarding progress uses step column', () => {
  const code = fs.readFileSync('src/lib/onboarding.ts', 'utf8');
  assert(!code.includes('select("step_id")'), 'Should not select step_id');
  assert(code.includes('step'), 'Should reference step');
});

test('Issue 8: SSO config does not insert client_secret or read auto_approve_sso_users', () => {
  const code = fs.readFileSync('src/lib/sso.ts', 'utf8');
  assert(!code.includes('client_secret, issuer_url'), 'Should not insert client_secret');
  assert(!code.includes('data.auto_approve_sso_users'), 'Should not read auto_approve_sso_users');
});

test('Issue 9: integration sync route inserts schema-valid columns', () => {
  const code = fs.readFileSync('src/app/api/integrations/[id]/sync/route.ts', 'utf8');
  assert(code.includes('action: "SYNC"'), 'Should insert action: SYNC');
  assert(code.includes('details: {'), 'Should store details JSON');
});

test('Issue 10: cron reports route reads recipients and uses report.name', () => {
  const code = fs.readFileSync('src/app/api/cron/reports/route.ts', 'utf8');
  assert(code.includes('report.recipients'), 'Should read recipients');
  assert(code.includes('report.name'), 'Should use report.name');
});

test('Issue 11: verifyLatestBackup does not select checksum from backups', () => {
  const code = fs.readFileSync('src/lib/backup.ts', 'utf8');
  assert(!code.includes("select('checksum,"), 'Should not select checksum');
  assert(code.includes("from('backups')"), 'Should validate backups table');
});

test('Issue 12: audit log rotation worker writes user_role', () => {
  const code = fs.readFileSync('worker/jobs/audit_log_rotation.js', 'utf8');
  assert(code.includes('user_role'), 'Worker should insert user_role in audit_logs');
  assert(!code.includes('user_name, role, details'), 'Worker should not use role in audit_logs');
});

test('Issue 13: visitor_logs query uses correct relationship embed syntax', () => {
  const code = fs.readFileSync('src/app/api/visitors/route.ts', 'utf8');
  assert(code.includes('person:users!visitor_logs_user_id_fkey(*)'), 'Should embed person fkey');
  assert(code.includes('host:users!visitor_logs_host_user_id_fkey(*)'), 'Should embed host fkey');
});

test('Issue 14: server-export selects department_id from users table', () => {
  const code = fs.readFileSync('src/lib/server-export.ts', 'utf8');
  assert(code.includes('department_id'), 'Should select department_id from users');
});

test('Issue 15: student stats resolves department without sd.department', () => {
  const code = fs.readFileSync('src/app/api/students/stats/route.ts', 'utf8');
  assert(!code.includes('sd.department'), 'Should not reference sd.department');
  assert(code.includes('deptCodeMap'), 'Should map department codes');
});

test('Issue 16: dashboard aggregates today scans without 2000 cap', () => {
  const code = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(code.includes('todayInCountBuilder'), 'Should have count builder for todayIn');
  assert(code.includes('todayOutCountBuilder'), 'Should have count builder for todayOut');
  assert(code.includes('totalScans = todayIn + todayOut'), 'totalScans should be computed from total in + out');
});

test('Issue 17: personTypeBreakdown includes all roles', () => {
  const typesCode = fs.readFileSync('src/lib/types.ts', 'utf8');
  assert(typesCode.includes('"warden"'), 'PersonType should include warden');
  assert(typesCode.includes('"admin"'), 'PersonType should include admin');

  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(dbCode.includes('warden: { total: 0'), 'personTypeBreakdown should initialize warden');
  assert(dbCode.includes('sysadmin: { total: 0'), 'personTypeBreakdown should initialize sysadmin');
});

console.log(`\n🎉 Test Results: ${passedTests}/12 passed!`);
