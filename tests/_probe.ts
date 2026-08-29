const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();
const { getSupabaseServiceClient } = require("../src/lib/supabaseClient");
const svc = getSupabaseServiceClient();

(async () => {
  // 1. Faculty + staff with employee_details (role split)
  const { data: fac, error: fe } = await svc
    .from("users")
    .select("id,unique_id,name,role,department_id,status,employee_details(employee_id,designation,department_id,is_hod,joining_date)")
    .in("role", ["faculty", "staff"])
    .limit(10);
  console.log("FACULTY/STAFF err:", fe?.message, "count:", fac?.length);
  console.log(JSON.stringify(fac?.slice(0, 4), null, 1));

  const { count: facultyCount } = await svc.from("users").select("id", { count: "exact", head: true }).eq("role", "faculty");
  const { count: staffCount } = await svc.from("users").select("id", { count: "exact", head: true }).eq("role", "staff");
  console.log(`role counts -> faculty:${facultyCount} staff:${staffCount}`);

  // 2. Is faculty's unique_id the employee_id? (findPersonByUniqueId Tier-1 path)
  const sample = fac?.[0];
  if (sample) {
    const { data: byUid } = await svc.from("users").select("id,unique_id,name").eq("unique_id", sample.unique_id).maybeSingle();
    console.log("lookup by unique_id works:", !!byUid, byUid?.id === sample.id);
  }

  // 3. Faculty + staff movement_logs (have they ever been scanned?)
  const ids = (fac || []).map((f) => f.id);
  const { data: facLogs } = await svc.from("movement_logs").select("user_id,direction,reason,timestamp,gate_name").in("user_id", ids).order("timestamp", { ascending: false }).limit(6);
  console.log("FACULTY movement_logs sample:", JSON.stringify(facLogs));

  // 4. Is there a HOD?
  const { data: hods } = await svc.from("employee_details").select("employee_id,department_id,is_hod,designation").eq("is_hod", true);
  console.log("HODs (employee_details.is_hod=true):", JSON.stringify(hods));

  // 5. distinct departments for faculty
  const { data: depts } = await svc.from("employee_details").select("department_id").in("user_id", ids);
  const distinct = [...new Set((depts || []).map((d: any) => d.department_id))];
  console.log("faculty department_ids:", distinct.join(","));

  process.exit(0);
})().catch((e) => { console.error("PROBE FAILED:", e); process.exit(1); });
