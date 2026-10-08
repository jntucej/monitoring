import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🧪 Running Validation Tests for Issues 31-40...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

// Issue 31: UserManagement duplicate option
test('Issue 31: UserManagement does not have duplicate <option value="admin">', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/components/sysadmin/UserManagement.tsx'), 'utf8');
  const matches = content.match(/<option value="admin">Admin<\/option>/g);
  assert(matches && matches.length === 1, `Expected exactly 1 admin option, found: ${matches?.length}`);
});

// Issue 32: StudentInfographics Year label formatting
test('Issue 32: StudentInfographics formats year numbers to "1st Year", etc.', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/components/admin/StudentInfographics.tsx'), 'utf8');
  assert(content.includes('YEAR_LABELS'), 'Should define YEAR_LABELS mapping');
  assert(content.includes('1st Year'), 'Should include "1st Year" label');
  assert(content.includes('filterKey="year"'), 'FilterSelect passes filterKey="year"');
});

// Issue 33: Students page safe roll number fallback
test('Issue 33: Students page guards roll number parsing and displays fallback', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/app/(admin)/admin/students/page.tsx'), 'utf8');
  assert(content.includes('const roll = student.roll || student.uniqueId || "";'), 'Guards roll variable before parsing');
  assert(content.includes('roll ? parseRollNumber(roll) : null'), 'Safely calls parseRollNumber');
});

// Issue 34: useAuthHeaders & utils do not use handle for X-Session-Token
test('Issue 34: useAuthHeaders and utils only set X-Session-Token from currentSessionToken', () => {
  const hookContent = fs.readFileSync(path.join(ROOT, 'src/hooks/useAuthHeaders.ts'), 'utf8');
  const utilsContent = fs.readFileSync(path.join(ROOT, 'src/lib/utils.ts'), 'utf8');

  assert(!hookContent.includes('user?.handle'), 'useAuthHeaders must not use handle as session token');
  assert(!utilsContent.includes('state.user?.handle'), 'utils.getAuthHeaders must not use handle as session token');
  assert(hookContent.includes('const sessionToken = user?.currentSessionToken;'), 'useAuthHeaders uses currentSessionToken');
  assert(utilsContent.includes('const sessionToken = state.user?.currentSessionToken;'), 'utils uses currentSessionToken');
});

// Issue 35: getStudentYearFromRoll handles future admission years
test('Issue 35: getStudentYearFromRoll returns null for future admission years', async () => {
  const rollModule = await import('../src/lib/rollNumber.ts');
  const fixedNow = new Date('2026-10-09');

  const y24 = rollModule.getStudentYearFromRoll('24JJ1A0501', fixedNow);
  assert.strictEqual(y24, 3, `Expected year 3 for 2024 roll, got ${y24}`);

  const y26 = rollModule.getStudentYearFromRoll('26JJ1A0501', fixedNow);
  assert.strictEqual(y26, 1, `Expected year 1 for 2026 roll, got ${y26}`);

  const y30 = rollModule.getStudentYearFromRoll('30JJ1A0501', fixedNow);
  assert.strictEqual(y30, null, `Expected null for future roll 30JJ1A0501, got ${y30}`);
});

// Issue 36: Worker implements exponential backoff on bridge restart
test('Issue 36: worker/index.mjs implements exponential backoff and cleanup for bridge', () => {
  const content = fs.readFileSync(path.join(ROOT, 'worker/index.mjs'), 'utf8');
  assert(content.includes('bridgeRestartAttempts'), 'Tracks restart attempts');
  assert(content.includes('MAX_RESTART_DELAY_MS'), 'Defines max delay cap');
  assert(content.includes('scheduleBridgeRestart'), 'Uses backoff scheduler');
  assert(content.includes('clearTimeout(restartTimeout)'), 'Cleans up timer on SIGTERM');
});

// Issue 37: run_system_tests.ts verifies token omission in warning log
test('Issue 37: scripts/run_system_tests.ts verifies token is not logged in warnings', () => {
  const content = fs.readFileSync(path.join(ROOT, 'scripts/run_system_tests.ts'), 'utf8');
  assert(content.includes('D4a-token-hygiene'), 'Contains D4 token hygiene check');
  assert(content.includes('!loggedTokenString'), 'Asserts token string is not leaked into console warning');
});

// Issue 38: analytics reset button has type="button"
test('Issue 38: analytics page reset filter button has type="button"', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/app/(admin)/admin/analytics/page.tsx'), 'utf8');
  assert(content.includes('type="button"'), 'Button has explicit type="button"');
});

// Issue 39: PersonBadge supports all PersonType variants
test('Issue 39: PersonBadge supports all 12 PersonType values', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/components/shared/PersonBadge.tsx'), 'utf8');
  const roles = ['student', 'faculty', 'staff', 'worker', 'visitor', 'parent', 'guardian', 'hod', 'warden', 'operator', 'admin', 'sysadmin'];
  for (const role of roles) {
    assert(content.includes(`${role}:`), `PersonBadge config must include '${role}'`);
  }
});

// Issue 40: GlassThemeToggle uses namespaced localStorage key
test('Issue 40: GlassThemeToggle uses namespaced storage key with safe access', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/components/shared/GlassThemeToggle.tsx'), 'utf8');
  assert(content.includes('gate_monitor_theme_feedback_last'), 'Uses namespaced key');
  assert(!content.includes('"lastFeedbackTheme"'), 'Does not use raw un-namespaced key');
});

console.log(`\n🎉 Test Results: ${passed}/${passed + failed} passed!`);
if (failed > 0) {
  process.exit(1);
}
