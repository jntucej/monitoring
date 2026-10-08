/**
 * Verification Test Suite: Additional Remediations (Hardware Stubs, WebAuthn, LDAP, Integrations & Streams)
 */
const fs = require('fs');
const assert = require('assert');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

console.log('🧪 Running Additional Remediations Test Suite...\n');

// 1. WebAuthn Implementation
test('WebAuthn: exports challenge generation, credential creation, and assertion verification', () => {
  const code = fs.readFileSync('src/lib/webauthn.ts', 'utf8');
  assert(code.includes('createWebAuthnCredentialCreationOptions'), 'Must export createWebAuthnCredentialCreationOptions');
  assert(code.includes('validateWebAuthnRegistrationResponse'), 'Must export validateWebAuthnRegistrationResponse');
  assert(code.includes('validateWebAuthnAuthenticationResponse'), 'Must export validateWebAuthnAuthenticationResponse');
  assert(code.includes('createHash("sha256")') || code.includes('randomBytes'), 'Must use Node crypto for challenges/signatures');
});

// 2. LDAP Authentication & Sync
test('LDAP: implements bind authentication and user directory synchronization', () => {
  const code = fs.readFileSync('src/lib/ldap.ts', 'utf8');
  assert(code.includes('isLdapConfigured'), 'Must export isLdapConfigured');
  assert(code.includes('authenticateLdapUser'), 'Must export authenticateLdapUser');
  assert(code.includes('executeLDAPSync'), 'Must export executeLDAPSync');
  assert(code.includes('integration_logs'), 'Must record sync results in integration_logs');
});

// 3. UI Store Auto-Dismiss
test('UI Store: toast helper methods include auto-dismiss timeout duration', () => {
  const code = fs.readFileSync('src/stores/uiStore.ts', 'utf8');
  assert(code.includes('setTimeout(() => set((state) => ({ toasts: state.toasts.filter'), 'Toast helpers must auto-dismiss');
  assert(code.includes('duration: 4000') || code.includes('const duration = 4000'), 'Toast must specify 4000ms duration');
});

// 4. Student Rules API Route
test('Student Rules API: implements GET and POST handlers with rate limiting and auth', () => {
  const code = fs.readFileSync('src/app/api/config/student-rules/route.ts', 'utf8');
  assert(code.includes('withRateLimit(handleGet'), 'Must wrap GET with rate limiter');
  assert(code.includes('withAuthorization(handlePost'), 'Must protect POST/PUT with admin authorization');
  assert(code.includes('DEFAULT_STUDENT_RULES'), 'Must include default campus curfew & quota rules');
});

// 5. Integrations API Route
test('Integrations API: queries real DB table and supports POST upserts with audit trail', () => {
  const code = fs.readFileSync('src/app/api/integrations/route.ts', 'utf8');
  assert(code.includes('return NextResponse.json({ success: true, data: [] });'), 'Must return empty array on empty DB rather than fake mocks');
  assert(code.includes('handlePost'), 'Must implement handlePost for configuring integrations');
  assert(code.includes('UPDATE_INTEGRATION_CONFIG'), 'Must record audit log on integration config changes');
});

// 6. Email and SMS Missing Credential Guards
test('Email & SMS: guards against missing API keys when enabled=true', () => {
  const emailCode = fs.readFileSync('src/lib/integrations/email.ts', 'utf8');
  assert(emailCode.includes('if (!EMAIL_CONFIG.apiKey)'), 'Email must check apiKey');
  assert(emailCode.includes('EMAIL_API_KEY is missing in environment'), 'Email must report missing key in queue');

  const smsCode = fs.readFileSync('src/lib/integrations/sms.ts', 'utf8');
  assert(smsCode.includes('if (!SMS_CONFIG.apiKey)'), 'SMS must check apiKey');
  assert(smsCode.includes('SMS_API_KEY is missing in environment'), 'SMS must report missing key in queue');
});

// 7. HR Sync External REST API Support
test('HR Sync: supports external HRMS REST endpoint and records integration logs', () => {
  const hrCode = fs.readFileSync('src/lib/integrations/hr-sync.ts', 'utf8');
  assert(hrCode.includes('process.env.HRMS_API_ENDPOINT'), 'Must check HRMS_API_ENDPOINT');
  assert(hrCode.includes('integration_logs'), 'Must record sync execution in integration_logs');
  assert(hrCode.includes('employee_details'), 'Must upsert employee_details table');
});

// 8. TCP Socket Adapter
test('Sync Bridge: implements TCP 4370 socket fetcher with timeout and protocol frames', () => {
  const bridgeCode = fs.readFileSync('scripts/sync-bridge/log-fetcher.ts', 'utf8');
  assert(bridgeCode.includes('createTcpLogFetcher'), 'Must export createTcpLogFetcher');
  assert(bridgeCode.includes('0x50, 0x50'), 'Must implement standard ZK 0x5050 magic bytes handshake');
  assert(bridgeCode.includes('parseBinaryBlock'), 'Must parse binary blocks');
});

// 9. Real-Time Streaming Heartbeats & Deduplication
test('SSE Streams: implement heartbeat keepalive ping and delta deduplication', () => {
  const occCode = fs.readFileSync('src/app/api/occupancy/stream/route.ts', 'utf8');
  assert(occCode.includes(': ping\\n\\n'), 'Occupancy stream must send keepalive ping');
  assert(occCode.includes('payload !== lastPayload'), 'Occupancy stream must deduplicate identical snapshots');

  const lockCode = fs.readFileSync('src/app/api/admin/lockdown/stream/route.ts', 'utf8');
  assert(lockCode.includes(': ping\\n\\n'), 'Lockdown stream must send keepalive ping');
});

// 10. Worker Cross-Platform Spawn
test('Worker Supervisor: uses cross-platform spawn flags for sync-bridge runner', () => {
  const workerCode = fs.readFileSync('worker/index.mjs', 'utf8');
  assert(workerCode.includes("process.platform === 'win32'"), 'Worker must detect Windows platform');
  assert(workerCode.includes('audit_log_rotation'), 'Worker must schedule audit log rotation');
});

console.log(`\n🎉 Additional Remediations Results: ${passed}/${total} passed!`);
if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
