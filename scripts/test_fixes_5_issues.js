import assert from "node:assert";
import fs from "node:fs";

console.log("🧪 Running 5 Issues Verification Test Suite...\n");

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
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

// 1. Server-side gate-pass enforcement for student exits
test("Fix 1: addScan enforces validateStudentExitFlow for student exits", () => {
  const dbCode = readFile("src/lib/db.ts");
  const monDbCode = readFile("monitoring/src/lib/db.ts");

  for (const [label, code] of [["src/lib/db.ts", dbCode], ["monitoring/src/lib/db.ts", monDbCode]]) {
    assert(code.includes("validateStudentExitFlow"), `${label} must call validateStudentExitFlow`);
    assert(code.includes("isStudent && input.direction === \"OUT\""), `${label} must check student OUT direction`);
  }
});

// 2. 2FA enforced for all 2FA-enrolled users at login
test("Fix 2: Login route challenges any user with two_factor_enabled", () => {
  const loginCode = readFile("src/app/api/auth/login/route.ts");
  const monLoginCode = readFile("monitoring/src/app/api/auth/login/route.ts");

  for (const [label, code] of [["src/app/api/auth/login/route.ts", loginCode], ["monitoring/src/app/api/auth/login/route.ts", monLoginCode]]) {
    assert(
      code.includes("Boolean(user.two_factor_enabled) ||") || code.includes("user.two_factor_enabled ||"),
      `${label} requires MFA whenever user.two_factor_enabled is true`
    );
  }
});

// 3. Warden hostel scoping queries assigned_hostel and student_details.roll
test("Fix 3: Warden hostel scope queries assigned_hostel on users and roll on student_details", () => {
  const passCode = readFile("src/app/api/passes/[passId]/route.ts");
  const monPassCode = readFile("monitoring/src/app/api/passes/[passId]/route.ts");

  for (const [label, code] of [["src/app/api/passes/[passId]/route.ts", passCode], ["monitoring/src/app/api/passes/[passId]/route.ts", monPassCode]]) {
    assert(!code.includes("roll_number"), `${label} should not query non-existent roll_number column`);
    assert(!code.includes("meta?.hostel_block"), `${label} should not query non-existent meta column`);
    assert(code.includes("assigned_hostel"), `${label} must query assigned_hostel`);
    assert(code.includes('.eq("roll", pass.roll)'), `${label} must match roll on student_details`);
  }
});

// 4. /api/users/[id] PATCH handles flagStatus
test("Fix 4: /api/users/[id] PATCH handles flagStatus and flag_status", () => {
  const userRoute = readFile("src/app/api/users/[id]/route.ts");
  const monUserRoute = readFile("monitoring/src/app/api/users/[id]/route.ts");
  const adminPage = readFile("src/app/(admin)/admin/students/page.tsx");

  for (const [label, code] of [["src/app/api/users/[id]/route.ts", userRoute], ["monitoring/src/app/api/users/[id]/route.ts", monUserRoute]]) {
    assert(code.includes("body.flagStatus") || code.includes("body.flag_status"), `${label} must handle body.flagStatus`);
    assert(code.includes("setUserFlag(id, null"), `${label} must support clearing flags`);
    assert(code.includes("setUserFlag(id, upper"), `${label} must support valid enum flags`);
  }

  assert(!adminPage.includes('flagStatus: "suspicious"'), "admin students page should not send raw suspicious flag");
});

// 5. config_exit_reasons query does not produce PGRST116 multiple rows error
test("Fix 5: config_exit_reasons validation only filters requested reason code", () => {
  const dbCode = readFile("src/lib/db.ts");
  const monDbCode = readFile("monitoring/src/lib/db.ts");

  for (const [label, code] of [["src/lib/db.ts", dbCode], ["monitoring/src/lib/db.ts", monDbCode]]) {
    assert(!code.includes(".in('code', [input.reason, normReason, 'day_pass', 'home_out', 'daily_outing'])"), `${label} must not query unconditional list causing PGRST116`);
    assert(code.includes(".in('code', searchCodes)"), `${label} must query searchCodes`);
  }
});

console.log(`\n🎉 Test Suite Results: ${passed}/${total} passed!`);
if (passed !== total) {
  process.exit(1);
}
