import { signAccessToken, verifyAuthToken, hashPassword, verifyPassword } from '../src/lib/auth-token';
import { getAuthorizationUrl, mapExternalGroupToRole, SSOConfig } from '../src/lib/sso';
import { getCached, setCached, invalidateCache } from '../src/lib/cache';
import { checkRateLimit } from '../src/lib/rate-limit';
import { NextRequest } from 'next/server';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING GATE MONITOR CORE SYSTEM TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. JWT & Cryptographic Auth Token Test
  console.log('🔐 [1/4] Testing Authentication & Cryptographic Tokens...');
  const testClaims = {
    sub: 'user-uuid-12345',
    email: 'admin@college.edu',
    role: 'admin',
    account_status: 'ACTIVE',
    name: 'System Admin',
  };

  const accessToken = await signAccessToken(testClaims);
  assert(typeof accessToken === 'string' && accessToken.length > 50, 'Generate signed JWT access token');

  const verifiedPayload = await verifyAuthToken(accessToken);
  assert(verifiedPayload !== null && verifiedPayload.sub === testClaims.sub, 'Verify and decode valid access token');
  assert(verifiedPayload?.role === 'admin', 'Preserve role claims inside token payload');

  const badPayload = await verifyAuthToken('invalid.jwt.token.string');
  assert(badPayload === null, 'Safely reject tampered or invalid JWT string');

  const rawPassword = 'SecurePassword123!';
  const hashed = await hashPassword(rawPassword);
  assert(typeof hashed === 'string' && hashed.startsWith('$2'), 'Bcrypt hash password correctly');

  const isValid = await verifyPassword(rawPassword, hashed);
  assert(isValid === true, 'Verify correct password against bcrypt hash');

  const isInvalid = await verifyPassword('WrongPassword!', hashed);
  assert(isInvalid === false, 'Reject incorrect password against bcrypt hash');

  // 2. SSO & OIDC Security Primitives
  console.log('\n🌐 [2/4] Testing SSO & OIDC Security Primitives...');
  const mockConfig: SSOConfig = {
    providerId: 'google',
    enabled: true,
    clientId: 'test-client-id.apps.googleusercontent.com',
    issuerUrl: 'https://accounts.google.com',
    groupMappings: { 'Campus-Security-Leads': 'admin' },
  };
  const authUrl = getAuthorizationUrl(mockConfig, 'http://localhost:3000/api/auth/sso/callback', 'state-123');
  assert(authUrl.startsWith('https://accounts.google.com') && authUrl.includes('client_id=test-client-id'), 'Construct valid OIDC Authorization URL');

  assert(mapExternalGroupToRole(['Campus-Security-Leads']) === 'admin', 'Map Security Leads OIDC group to admin role');
  assert(mapExternalGroupToRole(['IT-Administrators']) === 'sysadmin', 'Map IT-Administrators OIDC group to sysadmin role');
  assert(mapExternalGroupToRole(['Unknown-Guest-Group']) === 'student', 'Safely default unmapped groups to student role');

  // 3. Cache & Rate Limiting Test
  console.log('\n⚡ [3/4] Testing Cache & Distributed Rate Limiting...');
  const testKey = 'test:college_setting:001';
  await setCached(testKey, { campusName: 'JNTU College', active: true }, 10);
  const cachedVal = await getCached<{ campusName: string }>(testKey);
  assert(cachedVal !== null && cachedVal.campusName === 'JNTU College', 'Store and retrieve structured object from cache');

  await invalidateCache('test:college_setting:*');
  assert((await getCached(testKey)) === null, 'Pattern-based cache invalidation cleans up matching keys');

  // Test in production mode for strict enforcement
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const limitConfig = { maxRequests: 2, windowMs: 5000, keyPrefix: 'test_limit' };
  const testIp = '198.51.100.1'; // non-localhost external IP
  const r1 = await checkRateLimit(testIp, limitConfig);
  assert(r1.limited === false && r1.remaining === 1, 'Initial request is permitted with token count');
  await checkRateLimit(testIp, limitConfig);
  const r3 = await checkRateLimit(testIp, limitConfig);
  assert(r3.limited === true && r3.remaining === 0, 'Exceeding threshold triggers rate limiting');
  process.env.NODE_ENV = origEnv;

  // 4. API Route Handlers Integration Test
  console.log('\n🚪 [4/4] Testing API Route Handlers & Input Sanitization...');
  const { POST: logoutHandler } = await import('../src/app/api/auth/logout/route');
  const logoutRes = await logoutHandler(new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' }));
  assert(logoutRes.status === 200, 'Logout route returns HTTP 200 OK');

  const { POST: loginHandler } = await import('../src/app/api/auth/login/route');
  const badLoginRes = await loginHandler(new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  }));
  assert(badLoginRes.status === 400, 'Login route rejects empty payload with HTTP 400');

  const { POST: refreshHandler } = await import('../src/app/api/auth/refresh/route');
  const emptyRefreshRes = await refreshHandler(new NextRequest('http://localhost:3000/api/auth/refresh', { method: 'POST' }));
  assert(emptyRefreshRes.status === 401, 'Token refresh without token returns HTTP 401');

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

