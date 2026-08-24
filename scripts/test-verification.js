const fs = require('fs');

async function testVerification() {
  const loginRes = await fetch('https://samples-clg.vercel.app/api/auth/pin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId: 'OP-001', pin: '12345678' })
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data.token;
  const sessionToken = loginJson.data.user.currentSessionToken;
  const operatorId = loginJson.data.user.id;

  const gatesRes = await fetch('https://samples-clg.vercel.app/api/gates', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'x-session-token': sessionToken
    }
  });
  const gatesJson = await gatesRes.json();
  console.log('Gates API response:', gatesJson);
  const gatesList = gatesJson.gates || gatesJson.data || gatesJson;
  const realGateId = Array.isArray(gatesList) ? gatesList[0]?.id : null;

  console.log('\n1. Lookup person 25JJ5A1201:');
  const personRes = await fetch('https://samples-clg.vercel.app/api/persons/25JJ5A1201', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'x-session-token': sessionToken
    }
  });
  console.log(await personRes.text());

  console.log('\n2. Add Scan log for 25JJ5A1201 at gate:', realGateId);
  const scanRes = await fetch('https://samples-clg.vercel.app/api/gate/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'x-session-token': sessionToken
    },
    body: JSON.stringify({
      roll: '25JJ5A1201',
      direction: 'OUT',
      gateId: realGateId,
      operatorId: operatorId,
      isManual: true
    })
  });
  console.log(await scanRes.text());
}

testVerification().catch(console.error);


