import {
  signAccessToken,
  signRefreshToken,
  signPasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  getAuthSigningKey,
  hashPassword,
  verifyPassword,
} from "../src/lib/auth-token";
import { generateMobileToken, verifyMobileToken } from "../src/lib/mobile-auth";
import { generateQrToken, validateQrToken } from "../src/lib/qr-token";
import { createEnrollToken, verifyEnrollToken } from "../src/lib/mfa-enroll";
import { getAuthorizationUrl, mapExternalGroupToRole, SSOConfig } from "../src/lib/sso";
import { getCached, setCached, invalidateCache } from "../src/lib/cache";

async function runTests() {
  console.log("====================================================");
  console.log("🧪 RUNNING GATE MONITOR CORE SYSTEM TEST SUITE");
  console.log("====================================================\n");

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

  // 1. JWT Cryptographic Auth Token & Secret Hygiene Tests
  console.log("🔐 [1/4] Testing Authentication Cryptographic Tokens & Secret Isolation...");

  // D1. Missing secret fails closed in prod
  const origEnv = process.env.NODE_ENV;
  const origSecret = process.env.AUTH_JWT_SECRET;
  try {
    (process.env as any).NODE_ENV = "production";
    delete process.env.AUTH_JWT_SECRET;
    let threw = false;
    try {
      getAuthSigningKey();
    } catch {
      threw = true;
    }
    assert(threw, "D1: Missing AUTH_JWT_SECRET fails closed in production");
  } finally {
    (process.env as any).NODE_ENV = origEnv;
    if (origSecret) process.env.AUTH_JWT_SECRET = origSecret;
  }

  // D2. Access Token signing & verification
  const testClaims = {
    sub: "user-uuid-12345",
    email: "admin@college.edu",
    role: "admin",
    account_status: "ACTIVE",
    name: "System Admin",
  };

  const accessToken = await signAccessToken(testClaims);
  assert(typeof accessToken === "string" && accessToken.length > 50, "Generate signed JWT access token");

  const verifiedAccess = await verifyAccessToken(accessToken);
  assert(
    verifiedAccess !== null &&
      verifiedAccess.sub === testClaims.sub &&
      verifiedAccess.token_type === "access",
    "D2: Verify and decode valid access token with token_type=access"
  );
  assert(verifiedAccess?.role === "admin", "Preserve role claims inside token payload");

  // D3. Refresh Token signing & verification
  const refreshToken = await signRefreshToken({
    sub: testClaims.sub,
    email: testClaims.email,
    role: testClaims.role,
  });
  const verifiedRefresh = await verifyRefreshToken(refreshToken);
  assert(
    verifiedRefresh !== null &&
      verifiedRefresh.sub === testClaims.sub &&
      verifiedRefresh.token_type === "refresh",
    "D3: Verify and decode valid refresh token with token_type=refresh"
  );

  // D4. Cross-Token Rejection
  const crossRefreshAsAccess = await verifyAccessToken(refreshToken);
  assert(crossRefreshAsAccess === null, "D4a: verifyAccessToken rejects refresh token");

  const crossAccessAsRefresh = await verifyRefreshToken(accessToken);
  assert(crossAccessAsRefresh === null, "D4b: verifyRefreshToken rejects access token");

  // D5. Password Reset Token isolation
  const resetToken = await signPasswordResetToken(testClaims.sub, testClaims.email);
  const verifiedReset = await verifyPasswordResetToken(resetToken);
  assert(
    verifiedReset !== null &&
      verifiedReset.sub === testClaims.sub &&
      verifiedReset.purpose === "password_reset",
    "D5a: Verify dedicated password reset token"
  );

  const resetAsAccess = await verifyAccessToken(resetToken);
  assert(resetAsAccess === null, "D5b: verifyAccessToken rejects password reset token");

  const resetAsRefresh = await verifyRefreshToken(resetToken);
  assert(resetAsRefresh === null, "D5c: verifyRefreshToken rejects password reset token");

  const accessAsReset = await verifyPasswordResetToken(accessToken);
  assert(accessAsReset === null, "D5d: verifyPasswordResetToken rejects regular access token");

  // D6. Mobile Token isolation
  const mobileToken = await generateMobileToken(testClaims.sub, "STU2024001");
  const verifiedMobile = await verifyMobileToken(mobileToken);
  assert(
    verifiedMobile !== null &&
      verifiedMobile.sub === testClaims.sub &&
      verifiedMobile.token_type === "mobile",
    "D6a: Verify mobile token with token_type=mobile"
  );
  const mobileAsAccess = await verifyAccessToken(mobileToken);
  assert(mobileAsAccess === null, "D6b: verifyAccessToken rejects mobile token");

  // D7. QR Token isolation
  const qrToken = await generateQrToken("STU2024001");
  const verifiedQrRoll = await validateQrToken(qrToken);
  assert(verifiedQrRoll === "STU2024001", "D7a: Validate QR verification token");
  const qrAsAccess = await verifyAccessToken(qrToken);
  assert(qrAsAccess === null, "D7b: verifyAccessToken rejects QR token");

  // D8. MFA Enroll Token isolation
  const enrollToken = await createEnrollToken(testClaims.sub);
  const verifiedEnrollUser = await verifyEnrollToken(enrollToken);
  assert(verifiedEnrollUser === testClaims.sub, "D8a: Verify MFA enrollment token");
  const enrollAsAccess = await verifyAccessToken(enrollToken);
  assert(enrollAsAccess === null, "D8b: verifyAccessToken rejects MFA enrollment token");

  // Tampered & Invalid tokens
  const badPayload = await verifyAccessToken("invalid.jwt.token.string");
  assert(badPayload === null, "Safely reject tampered or invalid JWT string");

  // Password hashing
  const rawPassword = "SecurePassword123!";
  const hashed = await hashPassword(rawPassword);
  assert(typeof hashed === "string" && hashed.startsWith("$2"), "Bcrypt hash password correctly");

  const isValid = await verifyPassword(rawPassword, hashed);
  assert(isValid === true, "Verify correct password against bcrypt hash");

  const isInvalid = await verifyPassword("WrongPassword!", hashed);
  assert(isInvalid === false, "Reject incorrect password against bcrypt hash");

  // 2. SSO OIDC Security Primitives
  console.log("\n🌐 [2/4] Testing SSO OIDC Security Primitives...");
  const mockConfig: SSOConfig = {
    providerId: "google",
    enabled: true,
    clientId: "test-client-id.apps.googleusercontent.com",
    issuerUrl: "https://accounts.google.com",
    groupMappings: { "Campus-Security-Leads": "admin" },
  };
  const authUrl = getAuthorizationUrl(mockConfig, "http://localhost:3000/api/auth/sso/callback", "state-123");
  assert(authUrl.startsWith("https://accounts.google.com") && authUrl.includes("client_id=test-client-id"), "Construct valid OIDC Authorization URL");

  assert(mapExternalGroupToRole(["Campus-Security-Leads"]) === "admin", "Map Security Leads OIDC group to admin role");
  assert(mapExternalGroupToRole(["IT-Administrators"]) === "sysadmin", "Map IT-Administrators OIDC group to sysadmin role");
  assert(mapExternalGroupToRole(["Unknown-Guest-Group"]) === "student", "Safely default unmapped groups to student role");

  // 3. Cache Test
  console.log("\n⚡ [3/4] Testing Cache Infrastructure...");
  const testKey = "test:college_setting:001";
  await setCached(testKey, { campusName: "JNTU College", active: true }, 10);
  const cachedVal = await getCached<{ campusName: string }>(testKey);
  assert(cachedVal !== null && cachedVal.campusName === "JNTU College", "Store and retrieve structured object from cache");

  await invalidateCache("test:college_setting:*");
  assert((await getCached(testKey)) === null, "Pattern-based cache invalidation cleans matching keys");

  // Summary
  console.log("\n====================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
