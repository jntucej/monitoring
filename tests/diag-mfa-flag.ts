/** Check the live MFA flag value. Run: npx tsx tests/diag-mfa-flag.ts */
const { loadLocalEnv } = require("../scripts/lib/env-loader");
loadLocalEnv();
const { getSupabaseServiceClient } = require("../src/lib/supabaseClient");
const svc = getSupabaseServiceClient();

const SET_FALSE = process.argv.includes("--set-false");

(async () => {
  const { data, error } = await svc
    .from("system_config")
    .select("key, value, updated_at")
    .eq("key", "global_settings")
    .maybeSingle();
  if (error) {
    console.log("system_config read error (table may not exist):", error.message);
    return;
  }
  if (!data) {
    console.log("No global_settings row — isMfaRequiredForAdmin() resolves to DEFAULT (false) = MFA optional ✅");
    return;
  }

  if (SET_FALSE && data.value?.mfaRequiredForAdmin === true) {
    const newValue = { ...data.value, mfaRequiredForAdmin: false, updatedAt: new Date().toISOString() };
    const { error: upErr } = await svc
      .from("system_config")
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq("key", "global_settings");
    if (upErr) {
      console.log("Update failed:", upErr.message);
      return;
    }
    console.log("✅ mfaRequiredForAdmin flipped to false in DB.");
    console.log("New value:", JSON.stringify(newValue, null, 2));
    return;
  }

  console.log("global_settings:", JSON.stringify(data.value, null, 2));
  console.log("=> mfaRequiredForAdmin =", data.value?.mfaRequiredForAdmin);
  if (data.value?.mfaRequiredForAdmin === true) {
    console.log("\nRun with --set-false to disable the MFA gate for admins.");
  }
})();
