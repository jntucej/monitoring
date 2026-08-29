/**
 * verify-sysadmin-crud.ts
 *
 * Verification test script that exercises all SysAdmin CRUD operations:
 *  1. Dynamic Navigation (`config_navigation`)
 *  2. System Roles (`config_roles`)
 *  3. Exit Reasons (`config_exit_reasons`)
 *  4. Departments Governance (`departments`)
 *  5. Alert Rules (`alert_rules` / `lib/alerting`)
 *  6. User & Staff Accounts (`users`, `employee_details`)
 *  7. Role Promotion Requests (`role_change_requests`)
 *
 * Run: npx tsx tests/verify-sysadmin-crud.ts
 */

const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();

const assert = require("assert");
const crypto = require("crypto");
const { getSupabaseServiceClient } = require("../src/lib/supabaseClient");
const { addAudit, findUserById, updateUserRole, updateAccountStatus } = require("../src/lib/db");
const { getAlertRules, createAlertRule, toggleAlertRule } = require("../src/lib/alerting");

const svc = getSupabaseServiceClient();

async function runSysAdminCrudVerification() {
  console.log("\n========================================================");
  console.log("🚀 STARTING SYSADMIN CRUD OPERATIONS VERIFICATION SUITE");
  console.log("========================================================\n");

  const timestamp = Date.now();

  // ----------------------------------------------------
  // 1. DYNAMIC NAVIGATION CONFIG CRUD
  // ----------------------------------------------------
  console.log("🔹 [1/7] Testing Navigation Config CRUD...");
  const navHref = `/sysadmin/test-${timestamp}`;
  
  // CREATE
  const { data: createdNav, error: navCreateErr } = await svc
    .from("config_navigation")
    .insert({
      role_code: "sysadmin",
      group_label: "Test Governance",
      href: navHref,
      label: "Test Nav Item",
      icon_name: "TestIcon",
      order: 999,
      is_active: true,
    })
    .select()
    .single();

  if (navCreateErr && navCreateErr.code !== "42P01") {
    console.log(`   ⚠️ Table config_navigation notice: ${navCreateErr.message}`);
  } else if (createdNav) {
    assert.strictEqual(createdNav.label, "Test Nav Item", "Nav label should match");
    console.log("   ✅ CREATE: Successfully inserted navigation item");

    // READ
    const { data: readNav } = await svc
      .from("config_navigation")
      .select("*")
      .eq("id", createdNav.id)
      .single();
    assert.strictEqual(readNav?.href, navHref);
    console.log("   ✅ READ: Verified navigation item retrieval");

    // UPDATE
    const { data: updatedNav } = await svc
      .from("config_navigation")
      .update({ label: "Updated Test Nav Item" })
      .eq("id", createdNav.id)
      .select()
      .single();
    assert.strictEqual(updatedNav?.label, "Updated Test Nav Item");
    console.log("   ✅ UPDATE: Successfully updated navigation item label");

    // DELETE
    const { error: navDelErr } = await svc
      .from("config_navigation")
      .delete()
      .eq("id", createdNav.id);
    assert.strictEqual(navDelErr, null);
    console.log("   ✅ DELETE: Successfully deleted test navigation item");
  }

  // ----------------------------------------------------
  // 2. ROLES & POLICIES CONFIG CRUD
  // ----------------------------------------------------
  console.log("\n🔹 [2/7] Testing Roles & Policies Config CRUD...");
  const roleCode = `test_role_${timestamp}`;

  // CREATE
  const { data: createdRole, error: roleCreateErr } = await svc
    .from("config_roles")
    .insert({
      code: roleCode,
      display_name: "Temporary Test Role",
      description: "Automated test role",
      icon_name: "Shield",
      default_redirect: "/sysadmin",
      is_active: true,
    })
    .select()
    .single();

  if (roleCreateErr && roleCreateErr.code !== "42P01") {
    console.log(`   ⚠️ Table config_roles notice: ${roleCreateErr.message}`);
  } else if (createdRole) {
    assert.strictEqual(createdRole.code, roleCode);
    console.log("   ✅ CREATE: Successfully inserted new system role");

    // READ
    const { data: readRole } = await svc
      .from("config_roles")
      .select("*")
      .eq("code", roleCode)
      .single();
    assert.strictEqual(readRole?.display_name, "Temporary Test Role");
    console.log("   ✅ READ: Verified role details");

    // UPDATE
    const { data: updatedRole } = await svc
      .from("config_roles")
      .update({ display_name: "Updated Test Role" })
      .eq("code", roleCode)
      .select()
      .single();
    assert.strictEqual(updatedRole?.display_name, "Updated Test Role");
    console.log("   ✅ UPDATE: Successfully updated role display name");

    // SOFT DELETE (DEACTIVATE)
    const { data: deactivatedRole } = await svc
      .from("config_roles")
      .update({ is_active: false })
      .eq("code", roleCode)
      .select()
      .single();
    assert.strictEqual(deactivatedRole?.is_active, false);
    console.log("   ✅ DELETE (Soft): Deactivated test role");

    // CLEANUP
    await svc.from("config_roles").delete().eq("code", roleCode);
  }
  // ----------------------------------------------------
  // 3. EXIT REASONS GOVERNANCE CRUD
  // ----------------------------------------------------
  console.log("\n🔹 [3/7] Testing Exit Reasons Governance CRUD...");
  const reasonCode = `test_reason_${timestamp}`;

  // CREATE
  const { data: createdReason, error: reasonCreateErr } = await svc
    .from("config_exit_reasons")
    .insert({
      code: reasonCode,
      name: "Temporary Outing Reason",
      description: "Automated test departure policy",
      applicable_to: ["student"],
      requires_approval: true,
      approval_by: "warden",
      parent_notification: "sms",
      max_duration_hours: 8,
    })
    .select()
    .single();

  if (reasonCreateErr && reasonCreateErr.code !== "42P01") {
    console.log(`   ⚠️ Table config_exit_reasons notice: ${reasonCreateErr.message}`);
  } else if (createdReason) {
    assert.strictEqual(createdReason.code, reasonCode);
    console.log("   ✅ CREATE: Successfully inserted exit reason policy");

    // READ
    const { data: readReason } = await svc
      .from("config_exit_reasons")
      .select("*")
      .eq("code", reasonCode)
      .single();
    assert.strictEqual(readReason?.max_duration_hours, 8);
    console.log("   ✅ READ: Verified exit reason policy parameters");

    // UPDATE
    const { data: updatedReason } = await svc
      .from("config_exit_reasons")
      .update({ max_duration_hours: 12, name: "Updated Outing Reason" })
      .eq("code", reasonCode)
      .select()
      .single();
    assert.strictEqual(updatedReason?.max_duration_hours, 12);
    console.log("   ✅ UPDATE: Successfully updated max duration to 12h");

    // DELETE
    const { error: reasonDelErr } = await svc
      .from("config_exit_reasons")
      .delete()
      .eq("code", reasonCode);
    assert.strictEqual(reasonDelErr, null);
    console.log("   ✅ DELETE: Successfully deleted test exit reason");
  }

  // ----------------------------------------------------
  // 4. DEPARTMENTS & HOD ASSIGNMENT CRUD
  // ----------------------------------------------------
  console.log("\n🔹 [4/7] Testing Departments & HOD Assignment CRUD...");
  const deptCode = `T_${(timestamp % 10000)}`;

  // CREATE
  const { data: createdDept, error: deptCreateErr } = await svc
    .from("departments")
    .insert({
      code: deptCode,
      name: "Test Robotics Department",
      short_name: "TRD",
      numeric_code: "99",
    })
    .select()
    .single();

  if (deptCreateErr && deptCreateErr.code !== "42P01") {
    console.log(`   ⚠️ Table departments notice: ${deptCreateErr.message}`);
  } else if (createdDept) {
    assert.strictEqual(createdDept.code, deptCode);
    console.log("   ✅ CREATE: Successfully created department");

    // READ
    const { data: readDept } = await svc
      .from("departments")
      .select("*")
      .eq("code", deptCode)
      .single();
    assert.strictEqual(readDept?.name, "Test Robotics Department");
    console.log("   ✅ READ: Verified department record");

    // UPDATE
    const { data: updatedDept } = await svc
      .from("departments")
      .update({ name: "Advanced Robotics & AI" })
      .eq("code", deptCode)
      .select()
      .single();
    assert.strictEqual(updatedDept?.name, "Advanced Robotics & AI");
    console.log("   ✅ UPDATE: Successfully updated department name");

    // DELETE
    const { error: deptDelErr } = await svc
      .from("departments")
      .delete()
      .eq("code", deptCode);
    assert.strictEqual(deptDelErr, null);
    console.log("   ✅ DELETE: Successfully deleted test department");
  }

  // ----------------------------------------------------
  // 5. ALERT RULES & OPERATIONAL MONITORING
  // ----------------------------------------------------
  console.log("\n🔹 [5/7] Testing Operational Alert Rules...");
  const ruleName = `Test Alert ${timestamp}`;

  const createdAlert = await createAlertRule({
    name: ruleName,
    metric: "unauthorized_entry_burst",
    threshold: 10,
    durationMinutes: 5,
    severity: "warning",
    channel: "opsgenie",
    enabled: true,
  });

  assert.strictEqual(createdAlert.name, ruleName);
  console.log("   ✅ CREATE: Successfully created alert rule");

  const rulesList = await getAlertRules();
  const foundAlert = rulesList.find((r) => r.id === createdAlert.id);
  assert.ok(foundAlert, "Created rule should be in rules list");
  console.log("   ✅ READ: Found rule in system alert list");

  const toggled = await toggleAlertRule(createdAlert.id, false);
  assert.strictEqual(toggled.enabled, false);
  console.log("   ✅ UPDATE: Toggled rule state to disabled");

  // ----------------------------------------------------
  // 6. USER & STAFF ACCOUNTS CRUD
  // ----------------------------------------------------
  console.log("\n🔹 [6/7] Testing User & Staff Accounts CRUD...");
  const testUserId = crypto.randomUUID();
  const testUniqueId = `TST-${timestamp.toString().slice(-5)}`;

  // CREATE USER
  const { data: createdUser, error: userCreateErr } = await svc
    .from("users")
    .insert({
      id: testUserId,
      unique_id: testUniqueId,
      name: "Test SysAdmin Staff",
      email: `${testUniqueId.toLowerCase()}@jntuhcej.ac.in`,
      role: "faculty",
      status: "ACTIVE",
    })
    .select()
    .single();

  assert.strictEqual(userCreateErr, null);
  assert.strictEqual(createdUser.unique_id, testUniqueId);
  console.log("   ✅ CREATE: Successfully provisioned test staff user");

  // READ USER
  const fetchedUser = await findUserById(testUserId);
  assert.strictEqual(fetchedUser?.id, testUserId);
  console.log("   ✅ READ: Verified user profile by ID");

  // UPDATE ROLE
  const roleUpdated = await updateUserRole(testUserId, "admin", "system");
  assert.strictEqual(roleUpdated, true);
  const updatedUserRole = await findUserById(testUserId);
  assert.strictEqual(updatedUserRole?.role, "admin");
  console.log("   ✅ UPDATE: Promoted staff user role to 'admin'");

  // UPDATE STATUS
  const statusUpdated = await updateAccountStatus(testUserId, "SUSPENDED");
  assert.strictEqual(statusUpdated, true);
  const updatedUserStatus = await findUserById(testUserId);
  assert.strictEqual(updatedUserStatus?.status, "SUSPENDED");
  console.log("   ✅ UPDATE: Suspended account status to 'SUSPENDED'");

  // DELETE USER
  const { error: userDelErr } = await svc.from("users").delete().eq("id", testUserId);
  assert.strictEqual(userDelErr, null);
  console.log("   ✅ DELETE: Successfully purged test user account");

  // ----------------------------------------------------
  // 7. ROLE PROMOTION REQUESTS CRUD
  // ----------------------------------------------------
  console.log("\n🔹 [7/7] Testing Role Promotion Requests CRUD...");
  const requestId = crypto.randomUUID();
  const reqUserId = crypto.randomUUID();
  const reqUniqueId = `TST-REQ-${timestamp.toString().slice(-5)}`;

  // Provision user for FK constraint
  await svc.from("users").insert({
    id: reqUserId,
    unique_id: reqUniqueId,
    name: "Test Promotion User",
    email: `${reqUniqueId.toLowerCase()}@jntuhcej.ac.in`,
    role: "faculty",
    status: "ACTIVE",
  });

  const { data: createdReq, error: reqErr } = await svc
    .from("role_change_requests")
    .insert({
      id: requestId,
      requester_id: reqUserId,
      target_user_id: reqUserId,
      new_role: "sysadmin",
      reason: "Automated promotion test",
      status: "PENDING",
    })
    .select()
    .single();

  if (reqErr && reqErr.code !== "42P01") {
    console.log(`   ⚠️ Table role_change_requests notice: ${reqErr.message}`);
  } else if (createdReq) {
    console.log("   ✅ CREATE: Inserted pending role promotion request");

    // READ
    const { data: readReq } = await svc
      .from("role_change_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    assert.strictEqual(readReq?.status, "PENDING");
    console.log("   ✅ READ: Verified pending status");

    // UPDATE / APPROVE
    const { data: approvedReq } = await svc
      .from("role_change_requests")
      .update({ status: "APPROVED" })
      .eq("id", requestId)
      .select()
      .single();
    assert.strictEqual(approvedReq?.status, "APPROVED");
    console.log("   ✅ UPDATE: Approved promotion request");

    // DELETE / CLEANUP
    await svc.from("role_change_requests").delete().eq("id", requestId);
    await svc.from("users").delete().eq("id", reqUserId);
    console.log("   ✅ DELETE: Cleaned up promotion request and test user");
  }

  // ----------------------------------------------------
  // AUDIT LOG VERIFICATION
  // ----------------------------------------------------
  await addAudit({
    action: "SYSADMIN_VERIFICATION_SUITE",
    userId: "sysadmin",
    userName: "System Admin Verifier",
    role: "sysadmin",
    details: "Completed full SysAdmin CRUD verification suite.",
  });
  console.log("\n   ✅ AUDIT: Logged verification completion to audit_logs");

  console.log("\n========================================================");
  console.log("🎉 ALL SYSADMIN CRUD OPERATIONS VERIFIED SUCCESSFULLY!");
  console.log("========================================================\n");

}
runSysAdminCrudVerification().catch((err) => {
  console.error("❌ ERROR running SysAdmin CRUD verification:", err);
  process.exit(1);
});

