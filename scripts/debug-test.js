const { createClient } = require('@supabase/supabase-js');

async function debug() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    return;
  }
  const supabase = createClient(url, key);

  // Get OP-001 user
  const { data: operator, error: opErr } = await supabase
    .from('users')
    .select('*')
    .eq('unique_id', 'OP-001')
    .single();

  if (opErr || !operator) {
    console.error("Operator not found", opErr);
    return;
  }

  // Let's call the API via fetch to localhost:3000
  // First, we need to log in to get session token
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "OP-001", password: "password" }) // try password
  }).catch(e => null);

  if (!loginRes || !loginRes.ok) {
    // try PIN login
    console.log("Password login failed, trying PIN login...");
    const pinRes = await fetch("http://localhost:3000/api/auth/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "OP-001", pin: "12345678" })
    }).catch(e => null);
    
    if (pinRes && pinRes.ok) {
      const result = await pinRes.json();
      console.log("PIN login success:", result);
      await testScan(result.data.token, result.data.user.currentSessionToken, operator.id);
    } else {
      console.log("PIN login failed", pinRes ? await pinRes.text() : "no server running");
    }
  } else {
    const result = await loginRes.json();
    console.log("Login success:", result);
    await testScan(result.data.token, result.data.user.currentSessionToken, operator.id);
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
