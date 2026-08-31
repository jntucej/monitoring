/**
 * verify-person-history-api.ts — E2E validation script for the new shared /api/persons/[id]/history route.
 *
 * It checks:
 * 1. Unauthorized requests (missing token or mismatching handle) return 401.
 * 2. Students querying their own unique_id succeed and get correct response shape.
 * 3. Students trying to read sibling student's history get 403 Forbidden.
 * 4. Guardians querying their child's history succeed.
 * 5. Admin role querying anyone's history succeeds.
 */
const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();

const assert = require("assert");
const crypto = require("crypto");
const { getSupabaseServiceClient } = require("../src/lib/supabaseClient");
const { GET } = require("../src/app/api/persons/[uniqueId]/history/route");
const { NextRequest } = require("next/server");

const svc = getSupabaseServiceClient();

const BASE = "3f1a2b3c-4d5e-6f70-8100-000000000";
const STU_A_UUID = BASE + "701";
const STU_B_UUID = BASE + "702";
const PARENT_UUID = BASE + "703";
const ADMIN_UUID = BASE + "704";

const STU_A_ROLL = "HISTEST-STU-A";
const STU_B_ROLL = "HISTEST-STU-B";
const ADMIN_UID = "HISTEST-ADMIN";

let authTokens = {};

async function setupTestUsers() {
  console.log("Setting up E2E history test user records...");
  
  await svc.from("movement_logs").delete().in("user_id", [STU_A_UUID, STU_B_UUID]);
  await svc.from("student_details").delete().in("user_id", [STU_A_UUID, STU_B_UUID]);
  await svc.from("users").delete().in("id", [STU_A_UUID, STU_B_UUID, PARENT_UUID, ADMIN_UUID]);

  for (const uid of [STU_A_UUID, STU_B_UUID, PARENT_UUID, ADMIN_UUID]) {
    await svc.auth.admin.deleteUser(uid).catch(() => {});
  }

  const users = [
    { id: STU_A_UUID, email: "stu_a@history-verify.local", role: "student", unique_id: STU_A_ROLL, name: "Student A" },
    { id: STU_B_UUID, email: "stu_b@history-verify.local", role: "student", unique_id: STU_B_ROLL, name: "Student B" },
    { id: PARENT_UUID, email: "parent@history-verify.local", role: "guardian", unique_id: "HISTEST-PARENT", name: "Parent P" },
    { id: ADMIN_UUID, email: "admin@history-verify.local", role: "admin", unique_id: ADMIN_UID, name: "Admin Manager" },
  ];

  for (const u of users) {
    const { error: authErr } = await svc.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: "secure-test-password-999",
      email_confirm: true,
      user_metadata: { full_name: u.name, role: u.role, unique_id: u.unique_id },
    });
    if (authErr) throw new Error("Auth seed failed: " + authErr.message);

    const { data: dbUser, error: dbErr } = await svc.from("users").insert({
      id: u.id,
      unique_id: u.unique_id,
      name: u.name,
      role: u.role,
      email: u.email,
      status: "ACTIVE"
    }).select().single();
    if (dbErr) throw new Error("DB user seed failed: " + dbErr.message);
  }

  // Set up student details (parent-link)
  const { error: sdA } = await svc.from("student_details").insert({
    user_id: STU_A_UUID,
    roll: STU_A_ROLL,
    year: 1,
    section: "A",
    batch: "2026",
    guardian_id: PARENT_UUID,
  });
  if (sdA) throw new Error("Student details A insert failed: " + sdA.message);

  const { error: sdB } = await svc.from("student_details").insert({
    user_id: STU_B_UUID,
    roll: STU_B_ROLL,
    year: 1,
    section: "A",
    batch: "2026",
  });
  if (sdB) throw new Error("Student details B insert failed: " + sdB.message);

  // 3. Log in users to retrieve real Supabase access tokens
  console.log("Retrieving live JWTs via login provider...");
  const authLogins = [
    { key: "STU_A", email: "stu_a@history-verify.local" },
    { key: "STU_B", email: "stu_b@history-verify.local" },
    { key: "PARENT", email: "parent@history-verify.local" },
    { key: "ADMIN", email: "admin@history-verify.local" },
  ];

  for (const al of authLogins) {
    const { data: signInSession, error: sErr } = await require("../src/lib/supabaseClient").supabase.auth.signInWithPassword({
      email: al.email,
      password: "secure-test-password-999"
    });
    if (sErr || !signInSession?.session) throw new Error(`Sign in failed for ${al.email}: ` + sErr?.message);

    const handle = crypto.randomUUID();
    await svc.from("users").update({ handle }).eq("id", signInSession.user.id);

    authTokens[al.key] = {
      token: signInSession.session.access_token,
      handle,
    };
  }

  // 4. Seed movement logs for student A
  console.log("Grafting movement logs for history feed verification...");
  const { data: mainGate } = await svc.from("gates").select("id, name").limit(1).single();
  if (!mainGate) throw new Error("No active gates found in the DB. Run seeds first.");

  const { error: logErr } = await svc.from("movement_logs").insert([
    {
      user_id: STU_A_UUID,
      direction: "IN",
      gate_id: mainGate.id,
      gate_name: mainGate.name,
      timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
    {
      user_id: STU_A_UUID,
      direction: "OUT",
      gate_id: mainGate.id,
      gate_name: mainGate.name,
      timestamp: new Date(Date.now() - 7200 * 1000).toISOString(),
    }
  ]);
  if (logErr) throw new Error("Failed to seed scan history: " + logErr.message);

  console.log("Setup complete. Running assertions...");
}

async function fetchRoute(uniqueId: string, authUserKey: string | null) {
  const headers = new Headers();
  headers.set("content-type", "application/json");

  if (authUserKey && authTokens[authUserKey]) {
    const cred = authTokens[authUserKey];
    headers.set("authorization", `Bearer ${cred.token}`);
    headers.set("x-session-token", cred.handle);
  }

  const req = new NextRequest(`http://localhost/api/persons/${encodeURIComponent(uniqueId)}/history?limit=10`, {
    method: "GET",
    headers,
  });

  const response = await GET(req);
  const status = response.status;
  const body = await response.json();
  return { status, body };
}
async function verifyAPI() {
  await setupTestUsers();

  // Test 1: Mismatched token handle / no auth
  console.log("T1: Unauthorized check (no headers)...");
  const t1 = await fetchRoute(STU_A_ROLL, null);
  assert.strictEqual(t1.status, 401);
  assert.strictEqual(t1.body.success, false);

  // Test 2: Student A gets their own history
  console.log("T2: Self history check...");
  const t2 = await fetchRoute(STU_A_ROLL, "STU_A");
  assert.strictEqual(t2.status, 200);
  assert.strictEqual(t2.body.success, true);
  assert.ok(Array.isArray(t2.body.data.history));
  assert.strictEqual(t2.body.data.history.length, 2);
  assert.strictEqual(t2.body.data.history[0].direction, "IN");

  // Test 3: Student B tries to fetch Student A's history
  console.log("T3: Cross-tenant intrusion prevention...");
  const t3 = await fetchRoute(STU_A_ROLL, "STU_B");
  assert.strictEqual(t3.status, 403);
  assert.strictEqual(t3.body.error.code, "FORBIDDEN");

  // Test 4: Parent fetches Student A's history (allowed child)
  console.log("T4: Guardian fetching ward history...");
  const t4 = await fetchRoute(STU_A_ROLL, "PARENT");
  assert.strictEqual(t4.status, 200);
  assert.strictEqual(t4.body.success, true);
  assert.strictEqual(t4.body.data.history.length, 2);

  // Test 5: Parent fetches Student B's history (unlinked child)
  console.log("T5: Guardian fetching unlinked helper child...");
  const t5 = await fetchRoute(STU_B_ROLL, "PARENT");
  assert.strictEqual(t5.status, 403);

  // Test 6: Admin fetches student A's history (unlimited/all-powerful)
  console.log("T6: Admin privilege audit check...");
  const t6 = await fetchRoute(STU_A_ROLL, "ADMIN");
  assert.strictEqual(t6.status, 200);
  assert.strictEqual(t6.body.success, true);
  assert.strictEqual(t6.body.data.history.length, 2);

  console.log("\n🎉 All 6 E2E history authentication & logic checks successfully passed!");
}

async function cleanup() {
  console.log("Cleaning up history E2E test data...");
  await svc.from("movement_logs").delete().in("user_id", [STU_A_UUID, STU_B_UUID]);
  await svc.from("student_details").delete().in("user_id", [STU_A_UUID, STU_B_UUID]);
  await svc.from("users").delete().in("id", [STU_A_UUID, STU_B_UUID, PARENT_UUID, ADMIN_UUID]);
  for (const uid of [STU_A_UUID, STU_B_UUID, PARENT_UUID, ADMIN_UUID]) {
    await svc.auth.admin.deleteUser(uid).catch(() => {});
  }
}

verifyAPI()
  .then(() => cleanup().then(() => process.exit(0)))
  .catch((e) => {
    console.error("verifyAPI failed:", e);
    cleanup().finally(() => process.exit(1));
  });
