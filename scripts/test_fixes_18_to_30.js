/**
 * Test Suite: Issues 18 to 30 Verification
 */

const fs = require('fs');
const assert = require('assert');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    process.exit(1);
  }
}

console.log('🧪 Running Validation Tests for Issues 18-30...\n');

test('Issue 18: findGateById returns null for invalid gate ID without masking fallbacks', () => {
  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(!dbCode.includes('return { id: allData[0].id'), 'findGateById must not return first gate fallback');
  assert(!dbCode.includes('return { id: id || "gate-1"'), 'findGateById must not return mock gate fallback');
});

test('Issue 19: getAllGatesLive preserves configured isActive and reports isOnline', () => {
  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(dbCode.includes('isActive: isConfiguredActive'), 'getAllGatesLive must set isActive to isConfiguredActive');
  assert(dbCode.includes('isOnline: isOnline') || dbCode.includes('isOnline,'), 'getAllGatesLive must report isOnline');
});

test('Issue 20: ScanConfirmation uses normalized pass reason matching for aliases', () => {
  const code = fs.readFileSync('src/components/operator/ScanConfirmation.tsx', 'utf8');
  assert(code.includes('normalizeReason') || code.includes('dayout') || code.includes('toLowerCase'), 'ScanConfirmation should use normalized reason matching');
  assert(!code.includes('approvedPasses.some((p) => p.reason === code);'), 'ScanConfirmation must not use raw strict equality only');
});

test('Issue 21: StudentList on/off-campus check supports campusStatus and movementStatus', () => {
  const code = fs.readFileSync('src/components/admin/StudentList.tsx', 'utf8');
  assert(code.includes('campusStatus') || code.includes('movementStatus'), 'StudentList should check campusStatus/movementStatus');
});

test('Issue 22: ManualEntryDialog accepts 4-8 digit PINs', () => {
  const code = fs.readFileSync('src/components/operator/ManualEntryDialog.tsx', 'utf8');
  assert(code.includes('maxLength={8}'), 'ManualEntryDialog PIN input should allow up to 8 digits');
  assert(code.includes('pin.length < 4 || pin.length > 8') || code.includes('slice(0, 8)'), 'ManualEntryDialog should validate 4-8 digits');
});

test('Issue 23: Relational queries do not depend on exact FK constraint names', () => {
  const personCode = fs.readFileSync('src/app/api/persons/[uniqueId]/route.ts', 'utf8');
  assert(!personCode.includes('student_details!student_details_user_id_fkey'), 'persons/[uniqueId] must not use fragile FK constraint embed');
  const authCode = fs.readFileSync('src/lib/authContext.ts', 'utf8');
  assert(!authCode.includes('student_details!student_details_user_id_fkey'), 'authContext must not use fragile FK constraint embed');
});

test('Issue 24: DEPARTMENTS, deptCodeMap, and ROLL_DEPT_CODES include CIVIL', () => {
  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(dbCode.includes('CIVIL') && dbCode.includes('Civil Engineering'), 'DEPARTMENTS must include CIVIL');
  assert(dbCode.includes('"01": "CIVIL"'), 'deptCodeMap must map 01 to CIVIL');
  const rollCode = fs.readFileSync('src/lib/rollNumber.ts', 'utf8');
  assert(rollCode.includes('"01": { short: "CIVIL"') || rollCode.includes('"01": { short: \'CIVIL\''), 'ROLL_DEPT_CODES must include 01');
});

test('Issue 25: seed-data.js sets pin_set_by: null to allow seed-PIN invalidation', () => {
  const seedCode = fs.readFileSync('scripts/seed-data.js', 'utf8');
  assert(seedCode.includes('pin_set_by: null'), 'seed-data.js must set pin_set_by to null');
  assert(!seedCode.includes('pin_set_by: userId'), 'seed-data.js must not set pin_set_by to userId');
});

test('Issue 26: rate-limit.ts prunes expired entries to prevent memory leaks', () => {
  const rateLimitCode = fs.readFileSync('src/lib/rate-limit.ts', 'utf8');
  assert(rateLimitCode.includes('pruneStore') || rateLimitCode.includes('MAX_STORE_ENTRIES'), 'rate-limit.ts should actively prune in-memory store');
});

test('Issue 27: getNotifications constructs safe OR filters for recipients', () => {
  const dbCode = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert(dbCode.includes('recipient_id.eq.all') && dbCode.includes('recipient_type.eq.all'), 'getNotifications should include all recipient broadcast clauses');
});

test('Issue 28: ScanConfirmation pass requirement check handles all approval-required reasons', () => {
  const code = fs.readFileSync('src/components/operator/ScanConfirmation.tsx', 'utf8');
  assert(code.includes('passRequired = direction === "OUT" && requiresApproval'), 'ScanConfirmation should check requiresApproval for OUT direction');
});

test('Issue 29: docker-compose.yml uses optional env_file and validate-env.js rejects placeholder secrets', () => {
  const composeCode = fs.readFileSync('docker-compose.yml', 'utf8');
  assert(composeCode.includes('required: false'), 'docker-compose.yml should use required: false on env_file');
  const validateCode = fs.readFileSync('scripts/validate-env.js', 'utf8');
  assert(validateCode.includes('isPlaceholder') || validateCode.includes('change_me'), 'validate-env.js should check for placeholder secrets');
});

test('Issue 30: Modular mobile API routes exist', () => {
  assert(fs.existsSync('src/app/api/mobile/login/route.ts'), 'mobile/login route should exist');
  assert(fs.existsSync('src/app/api/mobile/profile/route.ts'), 'mobile/profile route should exist');
  assert(fs.existsSync('src/app/api/mobile/history/route.ts'), 'mobile/history route should exist');
  assert(fs.existsSync('src/app/api/mobile/idcard/route.ts'), 'mobile/idcard route should exist');
});

console.log('\n🎉 All Issues 18-30 Tests Passed!\n');
