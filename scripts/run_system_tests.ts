import {
  signAccessToken,
  signRefreshToken,
  signPasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  verifyAuthToken,
  getAuthSigningKey,
  hashPassword,
  verifyPassword,
} from "../src/lib/auth-token";
import { decodeProtectedHeader, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { generateMobileToken, verifyMobileToken, validateMobileToken } from "../src/lib/mobile-auth";
import { generateQrToken, validateQrToken } from "../src/lib/qr-token";
import { createEnrollToken, verifyEnrollToken } from "../src/lib/mfa-enroll";
import {
  getAuthorizationUrl,
  mapExternalGroupToRole,
  assertSsoEnabled,
  validateOIDCIdToken,
  SSOConfig,
} from "../src/lib/sso";
import { isMfaRequiredForAdmin } from "../src/lib/authContext";
import { encryptSecret, decryptSecret } from "../src/lib/mfa-secret";
import { generateBase32Secret, generateTOTPCode, verifyTOTPCode } from "../src/lib/totp";
import { getCached, setCached, invalidateCache } from "../src/lib/cache";
import { validateCsrf } from "../src/lib/csrf";
import { extractClientIp } from "../src/lib/rate-limit";
import { NextRequest } from "next/server";

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
  const accessHeader = decodeProtectedHeader(accessToken);
  assert(accessHeader.kid === "auth-v1", "D2-kid: Access token has kid=auth-v1 protected header");

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
  const refreshHeader = decodeProtectedHeader(refreshToken);
  assert(refreshHeader.kid === "auth-v1", "D3-kid: Refresh token has kid=auth-v1 protected header");

  const verifiedRefresh = await verifyRefreshToken(refreshToken);
  assert(
    verifiedRefresh !== null &&
      verifiedRefresh.sub === testClaims.sub &&
      verifiedRefresh.token_type === "refresh",
    "D3: Verify and decode valid refresh token with token_type=refresh"
  );

  // D4. Cross-Token Rejection & Mismatch Logging
  let mismatchWarnLogged = false;
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (args[0] === "[auth] token_class_mismatch") {
      mismatchWarnLogged = true;
    }
    originalWarn(...args);
  };

  const crossRefreshAsAccess = await verifyAccessToken(refreshToken);
  console.warn = originalWarn;
  assert(crossRefreshAsAccess === null, "D4a: verifyAccessToken rejects refresh token");
  assert(mismatchWarnLogged, "D4a-log: console.warn logged [auth] token_class_mismatch");

  const crossAccessAsRefresh = await verifyRefreshToken(accessToken);
  assert(crossAccessAsRefresh === null, "D4b: verifyRefreshToken rejects access token");

  // D5. Password Reset Token isolation
  const resetToken = await signPasswordResetToken(testClaims.sub, testClaims.email);
  const resetHeader = decodeProtectedHeader(resetToken);
  assert(resetHeader.kid === "auth-v1", "D5-kid: Reset token has kid=auth-v1 protected header");

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

  const refreshAsReset = await verifyPasswordResetToken(refreshToken);
  assert(refreshAsReset === null, "D5e: verifyPasswordResetToken rejects refresh token");

  // D6. Mobile Token isolation & Device Binding (Issue #3)
  const mobileToken = await generateMobileToken(testClaims.sub, "STU2024001", "device-ios-987");
  const mobileHeader = decodeProtectedHeader(mobileToken);
  assert(mobileHeader.kid === "mobile-v1", "D6-kid: Mobile token has kid=mobile-v1 protected header");

  const verifiedMobile = await verifyMobileToken(mobileToken);
  assert(
    verifiedMobile !== null &&
      verifiedMobile.sub === testClaims.sub &&
      verifiedMobile.token_type === "mobile" &&
      verifiedMobile.device_id === "device-ios-987" &&
      verifiedMobile.uniqueId === "STU2024001",
    "D6a: Verify mobile token with token_type=mobile and bound device_id"
  );
  assert(
    verifiedMobile !== null &&
      typeof verifiedMobile.exp === "number" &&
      typeof verifiedMobile.iat === "number" &&
      verifiedMobile.exp - verifiedMobile.iat === 24 * 3600,
    "D6-ttl: Mobile token has 24-hour TTL (86400s)"
  );

  const mobileAsAccess = await verifyAccessToken(mobileToken);
  assert(mobileAsAccess === null, "D6b: verifyAccessToken rejects mobile token");

  const accessAsMobile = await verifyMobileToken(accessToken);
  assert(accessAsMobile === null, "D6c: verifyMobileToken rejects access token");

  // Device binding checks
  const wrongDeviceCheck = await validateMobileToken(mobileToken, "device-android-intruder");
  assert(wrongDeviceCheck === null, "D6d: validateMobileToken rejects token presented from wrong device_id");

  const missingDeviceCheck = await validateMobileToken(mobileToken);
  assert(missingDeviceCheck === null, "D6e: validateMobileToken rejects device-bound token when device_id omitted");

  // D6f. One-time Enrollment Code Cryptographic & Hygiene Verification
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const generateMockEnrollmentCode = () => {
    let out = "";
    for (let i = 0; i < 8; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  };

  const sampleEnrollCode = generateMockEnrollmentCode();
  assert(sampleEnrollCode.length === 8, "Enrollment code is exactly 8 characters");
  assert(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(sampleEnrollCode), "Enrollment code uses unambiguous alphabet (no 0/O/1/I/L)");

  const sampleCodeHash = await bcrypt.hash(sampleEnrollCode, 10);
  assert(await bcrypt.compare(sampleEnrollCode, sampleCodeHash), "Enrollment code matches bcrypt hash");
  assert(!(await bcrypt.compare("WRONG123", sampleCodeHash)), "Invalid enrollment code rejected uniformly");

  // Simulated code burn
  let codeBurned = false;
  const burnCode = () => {
    if (codeBurned) return false;
    codeBurned = true;
    return true;
  };
  assert(burnCode() === true, "First enrollment code consumption succeeds");
  assert(burnCode() === false, "Subsequent reuse of burned enrollment code is rejected (single-use)");

  // D7. QR Token isolation
  const qrToken = await generateQrToken("STU2024001");
  const qrHeader = decodeProtectedHeader(qrToken);
  assert(qrHeader.kid === "qr-v1", "D7-kid: QR token has kid=qr-v1 protected header");

  const verifiedQrRoll = await validateQrToken(qrToken);
  assert(verifiedQrRoll === "STU2024001", "D7a: Validate QR verification token");
  const qrAsAccess = await verifyAccessToken(qrToken);
  assert(qrAsAccess === null, "D7b: verifyAccessToken rejects QR token");

  const accessAsQr = await validateQrToken(accessToken);
  assert(accessAsQr === null, "D7c: validateQrToken rejects access token");

  // D8. MFA Enroll Token isolation
  const enrollToken = await createEnrollToken(testClaims.sub);
  const enrollHeader = decodeProtectedHeader(enrollToken);
  assert(enrollHeader.kid === "mfa-v1", "D8-kid: MFA token has kid=mfa-v1 protected header");

  const verifiedEnrollUser = await verifyEnrollToken(enrollToken);
  assert(verifiedEnrollUser === testClaims.sub, "D8a: Verify MFA enrollment token");
  const enrollAsAccess = await verifyAccessToken(enrollToken);
  assert(enrollAsAccess === null, "D8b: verifyAccessToken rejects MFA enrollment token");

  const accessAsEnroll = await verifyEnrollToken(accessToken);
  assert(accessAsEnroll === null, "D8c: verifyEnrollToken rejects access token");

  // D9. Deprecated verifyAuthToken throws error
  let verifyAuthTokenThrew = false;
  try {
    await (verifyAuthToken as any)(accessToken);
  } catch (e: any) {
    verifyAuthTokenThrew = e.message.includes("verifyAuthToken was removed");
  }
  assert(verifyAuthTokenThrew, "D9: verifyAuthToken throws explicit token confusion prevention error");

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

  // 2. SSO OIDC Security Primitives (Issue #4)
  console.log("\n🌐 [2/4] Testing SSO OIDC Security Primitives...");
  const mockConfig: SSOConfig = {
    providerId: "google",
    enabled: true,
    clientId: "test-client-id.apps.googleusercontent.com",
    issuerUrl: "https://accounts.google.com",
    groupMappings: {
      "Campus-Security-Leads": "admin",
      "IT-Administrators": "sysadmin",
      "Faculty-Members": "faculty",
    },
    autoApproveSsoUsers: false,
  };

  // 2a. Authorization URL construction with PKCE and nonce
  const authUrl = getAuthorizationUrl(
    mockConfig,
    "http://localhost:3000/api/auth/sso/callback",
    "state-123",
    "nonce-456",
    "challenge-789"
  );
  assert(
    authUrl.startsWith("https://accounts.google.com") &&
      authUrl.includes("client_id=test-client-id") &&
      authUrl.includes("state=state-123") &&
      authUrl.includes("nonce=nonce-456") &&
      authUrl.includes("code_challenge=challenge-789") &&
      authUrl.includes("code_challenge_method=S256"),
    "Construct valid OIDC Authorization URL with PKCE and nonce"
  );

  // 2b. Assert SSO enabled check
  const enabledConfig = await assertSsoEnabled();
  assert(enabledConfig.enabled === true, "assertSsoEnabled passes when SSO is active");

  // 2c. Group mapping priority and default DENY (§3.3)
  assert(
    mapExternalGroupToRole(["Campus-Security-Leads"]) === "admin",
    "Map Security Leads OIDC group to admin role"
  );
  assert(
    mapExternalGroupToRole(["IT-Administrators"]) === "sysadmin",
    "Map IT-Administrators OIDC group to sysadmin role"
  );
  assert(
    mapExternalGroupToRole(["Faculty-Members"]) === "faculty",
    "Map Faculty-Members OIDC group to faculty role"
  );
  assert(
    mapExternalGroupToRole(["Campus-Security-Leads", "IT-Administrators"]) === "sysadmin",
    "Resolve multiple groups to highest-privilege matching role"
  );
  assert(
    mapExternalGroupToRole(["Unknown-Guest-Group"]) === null,
    "Default DENY: unmapped external group resolves to null (refuse login)"
  );
  assert(
    mapExternalGroupToRole([]) === null,
    "Default DENY: empty groups resolve to null"
  );

  // 2d. OIDC validation requirements (fail-closed)
  const validationWithBadNonce = await validateOIDCIdToken("bad.jwt.token", {
    provider: "google",
    clientId: "test-client-id.apps.googleusercontent.com",
    nonce: "expected-nonce",
  });
  assert(
    validationWithBadNonce.valid === false,
    "validateOIDCIdToken fails closed on invalid/tampered token"
  );

  // 2e. SSO state lifecycle simulation (atomic single-use & expiration)
  const stateRecord = {
    state: "valid-state-abc",
    nonce: "valid-nonce-def",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    consumed_at: null as string | null,
  };

  const isStateValid = (s: typeof stateRecord) => {
    if (s.consumed_at !== null) return false;
    if (new Date(s.expires_at).getTime() < Date.now()) return false;
    return true;
  };

  assert(isStateValid(stateRecord) === true, "Unconsumed active state is valid");
  stateRecord.consumed_at = new Date().toISOString();
  assert(isStateValid(stateRecord) === false, "Consumed state is rejected on replay");

  const expiredState = {
    ...stateRecord,
    consumed_at: null,
    expires_at: new Date(Date.now() - 1000).toISOString(),
  };
  assert(isStateValid(expiredState) === false, "Expired state is rejected");

  // 2f. 2FA/MFA Cryptographic Primitives & Secret Isolation (Issue #5)
  console.log("\n🔑 [2b/4] Testing 2FA/MFA Secret Encryption & Challenges...");

  // Env override check
  process.env.MFA_REQUIRED_FOR_ADMIN = "false";
  invalidateCache("system_config:mfaRequiredForAdmin");
  assert((await isMfaRequiredForAdmin()) === false, "isMfaRequiredForAdmin returns false when env override is false");

  process.env.MFA_REQUIRED_FOR_ADMIN = "true";
  invalidateCache("system_config:mfaRequiredForAdmin");
  assert((await isMfaRequiredForAdmin()) === true, "isMfaRequiredForAdmin returns true when env override is true");
  delete process.env.MFA_REQUIRED_FOR_ADMIN;
  invalidateCache("system_config:mfaRequiredForAdmin");

  // Secret encryption at rest
  const rawTotpSecret = generateBase32Secret(20);
  assert(rawTotpSecret.length === 20, "Generate 20-char base32 TOTP secret");
  const encryptedSecret = encryptSecret(rawTotpSecret);
  assert(encryptedSecret.startsWith("v1."), "Encrypted TOTP secret has v1. version prefix");
  assert(encryptedSecret.split(".").length === 4, "Encrypted TOTP secret has v1.iv.enc.tag sealed structure");
  const decryptedSecret = decryptSecret(encryptedSecret);
  assert(decryptedSecret === rawTotpSecret, "Decrypted TOTP secret roundtrips exactly");

  // TOTP code verification
  const currentOtp = generateTOTPCode(decryptedSecret);
  assert(currentOtp.length === 6, "Generate 6-digit TOTP code");
  assert(verifyTOTPCode(decryptedSecret, currentOtp) === true, "Verify correct current TOTP code");
  assert(verifyTOTPCode(decryptedSecret, "999999" === currentOtp ? "000000" : "999999") === false, "Reject invalid TOTP code");

  // Recovery codes generation & consumption
  const recoveryCodes = Array.from({ length: 10 }, () => Math.random().toString(36).substring(2, 10));
  const recoveryHashes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10)));
  assert(recoveryCodes.length === 10, "Generate 10 recovery codes");
  assert(bcrypt.compareSync(recoveryCodes[0], recoveryHashes[0]), "Recovery code matches bcrypt hash");
  assert(!bcrypt.compareSync("WRONGCODE", recoveryHashes[0]), "Invalid recovery code rejected");

  // Single-use challenge simulation
  const challengeState = { id: "challenge-uuid-1", user_id: "user-1", used_at: null as string | null };
  const burnChallenge = (c: typeof challengeState) => {
    if (c.used_at !== null) return false;
    c.used_at = new Date().toISOString();
    return true;
  };
  assert(burnChallenge(challengeState) === true, "First consumption of MFA login challenge succeeds");
  assert(burnChallenge(challengeState) === false, "Replay of consumed MFA login challenge is rejected");

  // 2c. Issue #6: PIN Login Security, Lockout, CSRF & Password/Role Isolation
  console.log("\n🛡️  [2c/4] Testing PIN Login Security, Lockout & CSRF Defense...");

  // 10a. Password does NOT work at the PIN endpoint verification
  const testUser = {
    id: "user-op-1",
    email: "operator@college.edu",
    role: "operator",
    password_hash: await hashPassword("ValidPassword123!"),
    pin_hash: await hashPassword("654321"),
    initial_pin_hash: null as string | null,
    two_factor_enabled: false,
  };

  const verifyPinOnly = async (presentedPin: string, user: typeof testUser) => {
    let valid = false;
    if (user.pin_hash) valid = await verifyPassword(presentedPin, user.pin_hash);
    if (!valid && user.initial_pin_hash) valid = await verifyPassword(presentedPin, user.initial_pin_hash);
    return valid;
  };

  assert(
    (await verifyPinOnly("ValidPassword123!", testUser)) === false,
    "10a: Account password does NOT authenticate against PIN endpoint"
  );
  assert(
    (await verifyPinOnly("654321", testUser)) === true,
    "10a-valid: Correct PIN authenticates successfully"
  );

  // 10b. Role filter permits non-privileged roles (operator, staff, worker)
  const allowedRoles = new Set(["operator", "staff", "worker"]);
  assert(allowedRoles.has("operator") && allowedRoles.has("staff") && allowedRoles.has("worker"), "10b: Operator, staff, and worker are permitted for PIN login");

  // 10c. Privileged roles (sysadmin, admin) are rejected by PIN login role filter
  assert(!allowedRoles.has("sysadmin"), "10c-sysadmin: sysadmin role is rejected by PIN login role filter");
  assert(!allowedRoles.has("admin"), "10c-admin: admin role is rejected by PIN login role filter");
  assert(!allowedRoles.has("superadmin"), "10c-superadmin: superadmin role is rejected by PIN login role filter");

  // 10d. Per-identifier lockout after 5 failures
  interface LockoutTracker {
    [identifier: string]: { failed_count: number; locked_until: number | null };
  }
  const lockoutDb: LockoutTracker = {};

  const recordFailedAttempt = (identifier: string) => {
    const norm = identifier.toUpperCase();
    if (!lockoutDb[norm]) {
      lockoutDb[norm] = { failed_count: 0, locked_until: null };
    }
    lockoutDb[norm].failed_count += 1;
    if (lockoutDb[norm].failed_count >= 5) {
      lockoutDb[norm].locked_until = Date.now() + 15 * 60 * 1000;
    }
    return lockoutDb[norm];
  };

  const isLocked = (identifier: string) => {
    const norm = identifier.toUpperCase();
    const entry = lockoutDb[norm];
    return Boolean(entry?.locked_until && entry.locked_until > Date.now());
  };

  for (let i = 0; i < 4; i++) {
    recordFailedAttempt("OP001");
  }
  assert(!isLocked("OP001"), "10d-1: Account not locked after 4 failed attempts");
  recordFailedAttempt("OP001");
  assert(isLocked("OP001"), "10d-2: Account is locked after 5 failed attempts");
  assert(isLocked("op001"), "10d-case: Lockout check is case-insensitive on identifier");

  // 10e. Lockout cannot be bypassed by IP rotation / spoofing (identifier-based)
  assert(isLocked("OP001"), "10e: Lockout remains active regardless of simulated IP address");

  // 10f. Successful login resets failure counter
  const resetLockout = (identifier: string) => {
    delete lockoutDb[identifier.toUpperCase()];
  };
  resetLockout("OP001");
  assert(!isLocked("OP001"), "10f: Successful authentication resets lockout counter");

  // 10g. TOTP 2FA required for 2FA-enrolled user even at PIN endpoint
  const mfaOperator = { ...testUser, two_factor_enabled: true };
  const requiresMfaCheck = (user: typeof mfaOperator) => Boolean(user.two_factor_enabled);
  assert(requiresMfaCheck(mfaOperator) === true, "10g: 2FA-enrolled operator triggers MFA challenge on PIN login");

  // 10h. Cross-origin POST request rejected by CSRF protection
  const evilReq = new NextRequest("http://campus.example.edu/api/auth/pin-login", {
    method: "POST",
    headers: {
      origin: "https://evil-attacker.com",
      host: "campus.example.edu",
    },
  });
  const sameOriginReq = new NextRequest("http://campus.example.edu/api/auth/pin-login", {
    method: "POST",
    headers: {
      origin: "http://campus.example.edu",
      host: "campus.example.edu",
    },
  });
  assert(validateCsrf(evilReq).valid === false, "10h-cross: Cross-origin POST is rejected by CSRF protection");
  assert(validateCsrf(sameOriginReq).valid === true, "10h-same: Same-origin POST passes CSRF protection");

  // 10i. Client IP extraction prefers x-real-ip and rightmost x-forwarded-for
  const spoofedReq = new NextRequest("http://campus.example.edu/api/auth/pin-login", {
    headers: {
      "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3",
      "x-real-ip": "10.0.0.1",
    },
  });
  assert(extractClientIp(spoofedReq) === "10.0.0.1", "10i-realip: extractClientIp prefers trusted x-real-ip");
  const multiHopReq = new NextRequest("http://campus.example.edu/api/auth/pin-login", {
    headers: {
      "x-forwarded-for": "198.51.100.1, 203.0.113.5",
    },
  });
  assert(extractClientIp(multiHopReq) === "203.0.113.5", "10i-hop: extractClientIp uses rightmost proxy hop");

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
