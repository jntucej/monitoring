const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();

const assert = require("assert");

async function getTestStudent() {
  const { getSupabaseServiceClient } = require("../src/lib/supabaseClient");
  const service = getSupabaseServiceClient();

  // 1. Create a genuine auth user to satisfy FK on auth.users(id)
  const testEmail = `e2e.student.${Date.now()}@college.edu`;
  const { data: authData, error: authErr } = await service.auth.admin.createUser({
    email: testEmail,
    email_confirm: true,
    password: "Password123!",
  });

  let userId: string;
  if (authData?.user?.id) {
    userId = authData.user.id;
  } else {
    // If user creation failed (e.g. limit), find an auth user
    const { data: authList } = await service.auth.admin.listUsers();
    if (authList?.users?.length > 0) {
      userId = authList.users[0].id;
    } else {
      userId = require("crypto").randomUUID();
    }
  }

  const roll = `E2E-${Date.now().toString().slice(-6)}`;
  const userRow = {
    id: userId,
    unique_id: roll,
    name: "Automated E2E Student",
    email: testEmail,
    role: "student",
    status: "ACTIVE",
  };

  const { data } = await service.from("users").upsert([userRow], { onConflict: "id" }).select().single();
  return data || userRow;
}

async function runEndToEndWorkflowTest() {
  console.log("=================================================");
  console.log("Starting End-to-End Gate Pass & Exit Workflow Test");
  console.log("=================================================");

  const { createGatePass, approvePass, addScan, findPass } = require("../src/lib/db");

  // 1. Ensure test student exists
  const studentUser = await getTestStudent();
  const testRoll = studentUser.unique_id || studentUser.roll || "21N81A0501";
  console.log(`Using student: ${studentUser.name || "Student"} (${testRoll}) - ID: ${studentUser.id}`);

  // 2. Student Applies for a Day Pass
  console.log("\nStep 1: Student applying for Day Pass...");
  const todayStr = new Date().toISOString().split("T")[0];
  const fromTime = `${todayStr}T09:00:00.000Z`;
  const toTime = `${todayStr}T21:00:00.000Z`;

  const pass = await createGatePass({
    roll: testRoll,
    reason: "day_pass",
    from: fromTime,
    to: toTime,
    description: "Personal errands in city",
    requestedById: studentUser.id,
    requestedByName: studentUser.name || "Student",
  });

  if (!pass) {
    console.error("❌ Failed to create gate pass.");
    process.exit(1);
  }

  console.log(`✅ Pass Created! ID: ${pass.id}, Roll: ${pass.roll}, Reason: ${pass.reason}, Final Status: ${pass.finalStatus}`);
  assert.strictEqual(pass.finalStatus, "PENDING", "Initial status should be PENDING");

  // 3. Warden Approves the Gate Pass
  console.log("\nStep 2: Warden approving the Gate Pass...");
  const approved = await approvePass(pass.id, "warden", "Approved for city outing.", studentUser.id);
  assert(approved, "Warden approval should succeed");

  const approvedPass = await findPass(pass.id);
  console.log(`✅ Pass Approved! ID: ${approvedPass?.id}, Final Status: ${approvedPass?.finalStatus}, Admin Status: ${approvedPass?.adminStatus}`);
  assert.strictEqual(approvedPass?.finalStatus, "APPROVED", "Final status should be APPROVED after warden approval");

  // 4. Operator Scans & Kicks Him Out (Exit Movement)
  console.log("\nStep 3: Operator recording EXIT scan (kicking student out)...");
  const scanResult = await addScan({
    roll: testRoll,
    direction: "OUT",
    reason: "day_pass",
    gateId: "gate-1",
    operatorId: studentUser.id,
    isManual: false,
  });

  console.log(`✅ Gate Exit Scan Recorded! Scan ID: ${scanResult.scan.id}, Direction: ${scanResult.scan.direction}, Roll: ${scanResult.scan.roll}`);
  assert.strictEqual(scanResult.scan.direction, "OUT", "Scan direction should be OUT");

  console.log("\n=================================================");
  console.log("🎉 ALL END-TO-END WORKFLOW STEPS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runEndToEndWorkflowTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
