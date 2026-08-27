const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./lib/env-loader');

loadLocalEnv();

async function debug() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    return;
  }

  const operatorId = process.env.TEST_OPERATOR_ID;
  const operatorPin = process.env.TEST_OPERATOR_PIN;
  if (!operatorId || !operatorPin) {
    console.error(
      "CRITICAL ERROR: TEST_OPERATOR_ID and TEST_OPERATOR_PIN are required.\n" +
      "Add them to .env.local (values are NOT stored in this repo)."
    );
    return;
  }
  const supabase = createClient(url, key);

  // Get the operator user
  const { data: operator, error: opErr } = await supabase
    .from('users')
    .select('*')
    .eq('unique_id', operatorId)
    .single();

  if (opErr || !operator) {
    console.error("Operator not found", opErr);
    return;
  }

  // Call the API via fetch to localhost:3000.
  // Supabase Auth is the sole authentication authority — the legacy custom
  // password login no longer exists, so only the PIN endpoint is exercised.
  console.log("Trying PIN login...");
  const pinRes = await fetch("http://localhost:3000/api/auth/pin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId: operatorId, pin: operatorPin })
  }).catch(e => null);

  if (pinRes && pinRes.ok) {
    const result = await pinRes.json();
    console.log("PIN login success:", result);
    await testScan(result.data.token, result.data.user.currentSessionToken, operator.id);
  } else {
    console.log("PIN login failed", pinRes ? await pinRes.text() : "no server running");
  }
}

async function testScan(token, sessionToken, operatorId) {
  const roll = '24JJ1A0501';
  const gateId = 'a52afdfb-dbd5-42b8-b616-da9d99295100';
  
  console.log("Sending scan request...");
  const headers = { 
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "X-Session-Token": sessionToken,
    "x-user-id": operatorId,
    "x-user-role": "operator"
  };
  
  const scanRes = await fetch("http://localhost:3000/api/gate/scan", {
    method: "POST",
    headers,
    body: JSON.stringify({
      roll,
      direction: "IN",
      reason: "Regular",
      gateId,
      operatorId,
      isManual: false
    })
  });
  
  console.log("Scan status:", scanRes.status);
  const result = await scanRes.json();
  console.log("Scan result:", result);
}

debug();
