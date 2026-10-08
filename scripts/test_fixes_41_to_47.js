import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function readFile(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
}

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('🧪 Running Validation Tests for Issues 41-47 (Foreign Table Filtering, RPC Whitelist, Sessions & Reset Auth, IST Timezone)...\n');

// 1. Foreign-table filtering in PostgresQueryBuilder
test('Task 1: PostgresQueryBuilder contains FK_MAP and handles foreignTable.column filters', () => {
  const pgSource = readFile('src/lib/postgres.ts');
  assert(pgSource.includes('FK_MAP'), 'PostgresQueryBuilder should define FK_MAP');
  assert(pgSource.includes('movement_logs'), 'FK_MAP should include movement_logs');
  assert(pgSource.includes('f.column.includes(".")'), 'buildWhereClause should detect foreign table dot-notation columns');
  assert(pgSource.includes('IN (SELECT id FROM'), 'buildWhereClause should emit subquery for foreign table filters');
});

// 2. PostgresQueryBuilder or() with foreignTable
test('Task 1b: PostgresQueryBuilder or() with foreignTable uses FK_MAP', () => {
  const pgSource = readFile('src/lib/postgres.ts');
  assert(pgSource.includes('PostgresQueryBuilder.FK_MAP[this.tableName]?.[orObj.foreignTable]'), 'or() should look up foreign key using FK_MAP');
});

// 3. Whitelist process_gate_scan in ALLOWED_RPC_FUNCTIONS and handle in db.rpc
test('Task 2: Whitelist process_gate_scan in ALLOWED_RPC_FUNCTIONS and special-case rpc call', () => {
  const pgSource = readFile('src/lib/postgres.ts');
  assert(pgSource.includes('"process_gate_scan"'), 'ALLOWED_RPC_FUNCTIONS should include process_gate_scan');
  assert(pgSource.includes('fnName === "process_gate_scan"'), 'db.rpc should handle process_gate_scan explicitly');
  assert(pgSource.includes('SELECT * FROM process_gate_scan('), 'db.rpc should invoke SELECT * FROM process_gate_scan(...)');
  assert(pgSource.includes('args.p_dup_window_minutes ?? 5'), 'db.rpc should supply default 5 minutes for dup window');
});

// 4. Fix addScan fallback insert to include joined user
test('Task 3: addScan fallback insert attaches user record', () => {
  const dbSource = readFile('src/lib/db.ts');
  assert(dbSource.includes('const personRecord = await findPersonByUniqueId(uniqueId)'), 'addScan should re-fetch person by uniqueId after fallback insert');
  assert(dbSource.includes('mScan({ ...data, users: personRecord || person })'), 'addScan should attach users object into mScan on insert');
});

// 5. Fix gate online detection using sessions table
test('Task 4: getAllGatesLive queries sessions table and active operators', () => {
  const dbSource = readFile('src/lib/db.ts');
  assert(dbSource.includes("from('sessions')"), 'getAllGatesLive should query sessions table');
  assert(dbSource.includes(".is('revoked_at', null)"), 'getAllGatesLive should check revoked_at IS NULL');
  assert(dbSource.includes(".gt('expires_at'"), 'getAllGatesLive should check expires_at > now');
  assert(dbSource.includes(".eq('role', 'operator')"), 'getAllGatesLive should filter online operators by role');
  assert(!dbSource.includes("not('handle', 'is', null)"), 'getAllGatesLive should not rely on users.handle');
});

// 6. Fix active sessions listing route
test('Task 5: /api/admin/sessions queries sessions table with joined user details', () => {
  const sessionsRoute = readFile('src/app/api/admin/sessions/route.ts');
  assert(sessionsRoute.includes('.from("sessions")'), 'sessions route should query sessions table');
  assert(sessionsRoute.includes('.is("revoked_at", null)'), 'sessions route should filter active unrevoked sessions');
  assert(sessionsRoute.includes('sessionId: s.id'), 'sessions route should map sessionId');
  assert(sessionsRoute.includes('userId: s.user_id'), 'sessions route should map userId');
  assert(sessionsRoute.includes('s.users?.name'), 'sessions route should map joined users name');
  assert(sessionsRoute.includes('s.users?.email'), 'sessions route should map joined users email');
  assert(sessionsRoute.includes('s.users?.role'), 'sessions route should map joined users role');
});

// 7. Remove unsafe password reset token fallback
test('Task 6: /api/auth/reset-password enforces strict DB token check with error handling', () => {
  const resetRoute = readFile('src/app/api/auth/reset-password/route.ts');
  assert(!resetRoute.includes('{ rows: [{ id: "fallback" }] }'), 'reset-password must remove fallback dummy row');
  assert(resetRoute.includes('SERVER_ERROR'), 'reset-password should return SERVER_ERROR if query fails');
  assert(resetRoute.includes('INVALID_TOKEN'), 'reset-password should return INVALID_TOKEN if tokenCheck is empty');
  assert(resetRoute.includes('tokenPersisted'), 'reset-password should only dispatch email if token persisted');
});

// 8. Align daily stats timezone to Asia/Kolkata
test('Task 7: statsToday and getDailyStats use Asia/Kolkata timezone', () => {
  const dbSource = readFile('src/lib/db.ts');
  assert(dbSource.includes("timeZone: 'Asia/Kolkata'"), 'db.ts should define helper with Asia/Kolkata timeZone');
  assert(dbSource.includes('getIstDateString()'), 'getDailyStats and statsToday should use getIstDateString');
  assert(dbSource.includes("dayStartUTC = `${day}T00:00:00+05:30`"), 'statsToday should use IST day start offset (+05:30)');

  const opStatsRoute = readFile('src/app/api/operator/stats/route.ts');
  assert(opStatsRoute.includes("timeZone: 'Asia/Kolkata'"), 'operator stats route should use Asia/Kolkata timeZone');
  assert(opStatsRoute.includes("dayStartUTC = `${day}T00:00:00+05:30`"), 'operator stats route should use IST offset');
});

console.log(`\n🎉 Test Results: ${passed}/${total} passed!`);
if (passed !== total) process.exit(1);
