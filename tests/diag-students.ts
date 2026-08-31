/**
 * Diagnose why the sysadmin Students page shows 0 records.
 * Run: npx tsx tests/diag-students.ts
 */
const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();
const { getSupabaseServiceClient } = require("../src/lib/supabaseClient");
const svc = getSupabaseServiceClient();

(async () => {
  // 1. Raw count of students by role
  const { data: byRole, error: roleErr } = await svc
    .from("users")
    .select("id, role, unique_id, name, status, created_at")
    .eq("role", "student");
  console.log(
    "== users WHERE role=student ==",
    roleErr ? `ERROR: ${JSON.stringify(roleErr)}` : `count=${byRole?.length}`
  );
  if (byRole?.length) console.log("sample:", JSON.stringify(byRole.slice(0, 3), null, 2));

  // 2. All roles present
  const { data: all } = await svc.from("users").select("role");
  const counts: Record<string, number> = {};
  (all || []).forEach((u: any) => { counts[u.role] = (counts[u.role] || 0) + 1; });
  console.log("== role distribution ==", counts);

  // 3. student_details rows
  const { data: sd, error: sdErr } = await svc.from("student_details").select("user_id, roll");
  console.log("== student_details ==", sdErr ? `ERROR: ${JSON.stringify(sdErr)}` : `count=${sd?.length}`);

  // 4. The exact findAllPersons query (plain select + eq role)
  const { data: q1, error: q1err } = await svc.from("users").select("*").eq("role", "student");
  console.log("== findAllPersons query ==", q1err ? `ERROR: ${JSON.stringify(q1err)}` : `count=${q1?.length}`);

  // 5. Old embedded join (to prove it was the culprit)
  const { data: q2, error: q2err } = await svc
    .from("users")
    .select("*, student_details!student_details_user_id_fkey(*), employee_details(*)")
    .eq("role", "student");
  console.log(
    "== OLD embedded join ==",
    q2err ? `ERROR: ${q2err.message} (code=${q2err.code})` : `count=${q2?.length}`
  );
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
