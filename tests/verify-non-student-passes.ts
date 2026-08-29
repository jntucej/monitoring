/**
 * verify-non-student-passes.ts
 *
 * End-to-end verification that Parents, Wardens/Operators, and Admins/SysAdmins
 * can perform their part of the gate-pass flow, and that every action produces a
 * verifiable audit trail + movement log in Supabase.
 *
 * Run: npx tsx tests/verify-non-student-passes.ts
 *
 * This script exercises the SAME db-layer functions that the API routes
 * (POST /api/passes, PUT /api/passes/{id}, POST /api/gate/scan) call, so it
 * validates the exact persistence + audit logic the HTTP contract relies on.
 *
 * It uses a dedicated TEST student (never a real student's roll) but the real
 * staff accounts discovered in this dev DB:
 *   parent = PAR-001, warden = WDN-001, admin = ADM-001, operator = OP-001
 * If any staff account is missing, a fallback is created so the script still runs.
 */
const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();

const assert = require("assert");
const crypto = require("crypto");
const { createGatePass, approvePass, addScan, findPass } = require("../src/lib/db");
const { getSupabaseServiceClient } = require("../src/lib/supabaseClient");
const svc = getSupabaseServiceClient();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STAFF = {
  parent:   { uid: "PAR-001", name: "Raj Devi (Parent)",   role: "guardian" },
  warden:   { uid: "WDN-001", name: "Boys Hostel Warden",  role: "warden" },
  admin:    { uid: "ADM-001", name: "Dr. Principal (Admin)", role: "admin" },
  operator: { uid: "OP-001",  name: "Main Gate Operator Desk", role: "operator" },
};

const TEST_STUDENT_UUID = "0f1a2b3c-4d5e-6f70-8100-000000000100";
const TEST_STUDENT_ROLL = "TESTDS-PARENT-001";
let runStart: string;

async function resolveStaff(uid: string, name: string, role: string): Promise<any> {
  const { data } = await svc.from("users").select("id,unique_id,name,role,status").eq("unique_id", uid).maybeSingle();
  if (data) return data;
  const { data: created } = await svc
    .from("users")
    .insert({ id: crypto.randomUUID(), unique_id: uid, name, role, email: `${uid.toLowerCase()}@test.local`, status: "ACTIVE" })
    .select("id,unique_id,name,role,status")
    .single();
  return created;
}

async function ensureTestStudent(guardianId: string | null): Promise<void> {
  await svc.from("users").upsert(
    { id: TEST_STUDENT_UUID, unique_id: TEST_STUDENT_ROLL, name: "Test Day Scholar (Parent Flow)", role: "student", email: "test.ds.parent@example.com", status: "ACTIVE" },
    { onConflict: "id" }
  ).select().single();
  await svc.from("student_details").upsert(
    { user_id: TEST_STUDENT_UUID, roll: TEST_STUDENT_ROLL, student_type: "DM", year: 2, section: "B", batch: "2025", gender: "male", guardian_id: guardianId || null },
    { onConflict: "user_id" }
  ).select().single();
}

async function resetTestMovement(): Promise<void> {
  await svc.from("movement_logs").delete().eq("user_id", TEST_STUDENT_UUID);
  await svc.from("campus_occupancy").delete().eq("user_id", TEST_STUDENT_UUID);
  await svc.from("gate_passes").delete().eq("roll", TEST_STUDENT_ROLL);
}

async function logCheck(table: string, predicate: (row: any) => boolean, label: string): Promise<void> {
  const { data, error } = await svc.from(table).select("*").gte("timestamp", runStart).order("timestamp", { ascending: false });
  assert.ifError(error);
  const found = (data || []).filter(predicate);
  assert.ok(found.length > 0, `Expected ≥1 row in ${table} for: ${label}`);
  console.log(`✅ Verified ${found.length} row(s) in ${table} for "${label}"`);
}

async function cleanup(): Promise<void> {
  try {
    await svc.from("movement_logs").delete().eq("user_id", TEST_STUDENT_UUID);
    await svc.from("campus_occupancy").delete().eq("user_id", TEST_STUDENT_UUID);
    await svc.from("gate_passes").delete().eq("roll", TEST_STUDENT_ROLL);
    await svc.from("users").delete().eq("id", TEST_STUDENT_UUID);
  } catch (e) { console.warn("cleanup(users) err:", (e as any)?.message); }
  try {
    await svc.from("audit_logs").delete()
      .or("action.eq.GATE_PASS_APPROVED_WARDEN,action.eq.GATE_PASS_APPROVED_ADMIN,action.eq.GATE_PASS_APPROVED_PARENT,action.eq.SCAN_CREATED")
      .gte("timestamp", runStart);
  } catch (e) { console.warn("cleanup(audit) err:", (e as any)?.message); }
}
async function run() {
  runStart = new Date().toISOString();
  console.log("=========================================================");
  console.log(" Non-Student Gate-Pass Lifecycle + Audit Verification");
  console.log("=========================================================");

  const parent = await resolveStaff(STAFF.parent.uid, STAFF.parent.name, STAFF.parent.role);
  const warden = await resolveStaff(STAFF.warden.uid, STAFF.warden.name, STAFF.warden.role);
  const admin = await resolveStaff(STAFF.admin.uid, STAFF.admin.name, STAFF.admin.role);
  const operator = await resolveStaff(STAFF.operator.uid, STAFF.operator.name, STAFF.operator.role);
  await ensureTestStudent(parent.id);
  await resetTestMovement();
  console.log(`Entities -> parent:${parent.unique_id} warden:${warden.unique_id} admin:${admin.unique_id} operator:${operator.unique_id} student:${TEST_STUDENT_ROLL}`);

  // ---- 1. PARENT applies for a Home-Out pass (pre-approved at guardian level) ----
  console.log("\n[1] Parent requesting Home Out pass...");
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 48 * 3600_000).toISOString();
  const parentPass = await createGatePass({
    roll: TEST_STUDENT_ROLL,
    reason: "home_out",
    from,
    to,
    description: "Weekend home leave",
    requestedById: parent.id,
    requestedByName: parent.name,
    isParentRequest: true,
  });
  assert(parentPass, "Parent-initiated pass should be created");
  // createGatePass pre-approves guardian_status but leaves final_status PENDING
  // (admin track still open) — the template's claimed 'APPROVED_PARENT' is stale.
  assert.strictEqual(parentPass.parentStatus, "APPROVED", "guardian_status should be APPROVED for a parent request");
  assert.strictEqual(parentPass.adminStatus, "PENDING", "admin_status should still be PENDING");
  assert.strictEqual(parentPass.finalStatus, "PENDING", "final_status should be PENDING until warden/admin acts");
  console.log(`✅ Parent pass created: id=${parentPass.id} guardian=${parentPass.parentStatus} admin=${parentPass.adminStatus} final=${parentPass.finalStatus}`);

  // ---- 2. WARDEN approves ----
  console.log("\n[2] Warden approving the parent pass...");
  const wardenOk = await approvePass(parentPass.id, "warden", "Verified via gate cam", warden.id);
  assert(wardenOk, "Warden approval should succeed");
  const wardenPass = await findPass(parentPass.id);
  assert(wardenPass, "Warden-approved pass should be found");
  assert.strictEqual(wardenPass?.adminStatus, "APPROVED", "admin_status APPROVED after warden");
  assert.strictEqual(wardenPass?.finalStatus, "APPROVED", "final_status APPROVED after warden");
  await logCheck("audit_logs", (r) => /GATE_PASS_APPROVED_WARDEN/.test(r.action || ""), "Warden approval audit");

  // ---- 3. ADMIN approves a separate day-pass (operator-requested) ----
  console.log("\n[3] Admin approving a separate day-pass...");
  const dayFrom = new Date().toISOString();
  const dayTo = new Date(Date.now() + 12 * 3600_000).toISOString();
  const adminPass = await createGatePass({
    roll: TEST_STUDENT_ROLL,
    reason: "day_pass",
    from: dayFrom,
    to: dayTo,
    description: "Doctor appointment",
    requestedById: operator.id,
    requestedByName: operator.name,
  });
  assert(adminPass, "Admin-track pass should be created");
  assert.strictEqual(adminPass.finalStatus, "PENDING", "day-pass should start PENDING");
  const adminOk = await approvePass(adminPass.id, "admin", "Admin override approved", admin.id);
  assert(adminOk, "Admin approval should succeed");
  const adminApproved = await findPass(adminPass.id);
  assert.strictEqual(adminApproved?.finalStatus, "APPROVED", "final_status APPROVED after admin");
  assert.strictEqual(adminApproved?.adminStatus, "APPROVED", "admin_status APPROVED after admin");
  await logCheck("audit_logs", (r) => /GATE_PASS_APPROVED_ADMIN/.test(r.action || ""), "Admin approval audit");

  // ---- 4. OPERATOR records an exit (kick-out) scan ----
  console.log("\n[4] Operator recording EXIT (kick-out) scan...");
  const scan = await addScan({ roll: TEST_STUDENT_ROLL, direction: "OUT", reason: "home_out", gateId: "GATE-01", operatorId: operator.id, isManual: false });
  assert.strictEqual(scan.scan.direction, "OUT", "Scan direction should be OUT");
  assert.strictEqual(scan.duplicate, false, "First exit scan should not be a duplicate");
  await logCheck("movement_logs", (r) => r.direction === "OUT" && r.user_id === TEST_STUDENT_UUID, "Exit (OUT) movement log");
  await logCheck("audit_logs", (r) => r.action === "SCAN_CREATED" && /OUT/.test(r.details || ""), "Operator exit-scan audit");

  console.log("\n🎉 All non-student roles and audit logs verified.");
  await cleanup();
}

run().catch((e) => {
  console.error(e);
  cleanup().finally(() => process.exit(1));
});
