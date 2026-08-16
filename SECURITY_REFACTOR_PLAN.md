# SECURITY REFACTOR PLAN
**Student Gate Monitoring System - Security Hardening**

## 1. OVERVIEW
This document outlines security findings and remediation plan for hardening the existing Student Gate Monitoring System into a secure backend-authoritative architecture.

**Current Status**: Repository audit in progress (Phase 1)
**Security Principle**: THE CLIENT IS UNTRUSTED - Never trust frontend state, client-provided IDs, or client claims

---

## 2. SECURITY FINDINGS

### CRITICAL FINDINGS (Must be fixed immediately)

#### CRITICAL-001: Missing Account Status Validation (FIXED: 2026-08-16)
**Severity**: CRITICAL
**Location**: `gate-monitor/src/lib/db.ts` - `mUser`, `findUserByLogin`, `verifyLogin` functions
**Status**: ✓ FIXED (PARTIAL PASS - Independent Verification)
**Description**:
- The authentication system now properly validates account status during login
- Users with non-ACTIVE status (LOCKED, SUSPENDED, DISABLED, DEPROVISIONED) cannot authenticate
- The `User` type definition includes account status field
- The `findUserByLogin()` function only returns ACTIVE users by default
- The `verifyLogin()` function explicitly checks account status

**Impact**:
- ✓ Disabled, suspended, or deprovisioned accounts cannot access the system
- ✓ Access can be revoked for compromised or inactive accounts
- ✓ Security principle enforced: "Only ACTIVE users can authenticate normally"

**Fix Details**:
- Updated `mUser` function to properly map the `status` field from database records
- Updated `findUserByLogin` function to only return ACTIVE users by default
- Updated `verifyLogin` function to explicitly check account status before allowing authentication
- Added `updateAccountStatus` function to manage account status changes and automatically revoke sessions
- Added `revokeAllSessions` function to manually revoke all active sessions for a user

**Verification**:
- ✓ Test files created: `TEST_account_status_security.ts`, `TEST_account_status_isolated.ts`
- ✓ Independent verification completed: `CRITICAL_001_INDEPENDENT_VERIFICATION.md`
- ✓ Core authentication paths validate account status
- ✓ Session revocation works when account status changes
- ✓ Non-ACTIVE accounts cannot authenticate via standard login
- ✓ Independent verification shows PARTIAL PASS with identified gaps

#### CRITICAL-002: No Session Invalidation on Role Changes
**Severity**: CRITICAL
**Location**: Throughout authentication system
**Description**:
- No mechanism to invalidate existing sessions when user roles change
- Role changes should require re-authentication
- Current system allows users to retain old permissions until session expires

**Impact**:
- Users can retain elevated privileges after role downgrade
- Security escalation possible if role changes are not properly enforced

**Required Fix**:
- Implement session revocation on role changes
- Add audit logging for role changes
- Force re-authentication after role modification

---

### HIGH FINDINGS

#### HIGH-001: Operator ID Forgery Vulnerability
**Severity**: HIGH
**Location**: `src/app/api/gate/scan/route.ts`, `src/lib/db.ts` - gate scan functions
**Description**:
- Gate scan API accepts `operatorId` from client request
- No validation that operatorId matches authenticated user
- Operator identity can be forged by sending arbitrary operatorId

**Impact**:
- Any authenticated user can impersonate any operator
- Audit logs can be manipulated
- Accountability is compromised

**Required Fix**:
- Remove operatorId from client requests
- Derive operator identity from authenticated session
- Validate operator has permission to operate at specified gate

#### HIGH-002: No Centralized Authorization Middleware
**Severity**: HIGH
**Location**: Throughout API routes
**Description**:
- Authorization checks are duplicated across API routes
- No centralized middleware for consistent authorization
- Risk of inconsistent or missing authorization checks

**Impact**:
- Inconsistent security enforcement
- Potential for authorization bypass
- Hard to maintain and audit

**Required Fix**:
- Create centralized authorization middleware
- Implement `requireAuth()`, `requireActiveAccount()`, `requirePermission()`, `requireResourceAccess()`
- Apply middleware consistently across all protected routes

---

### MEDIUM FINDINGS

#### MEDIUM-001: Insecure Direct Object Reference (IDOR) Risks
**Severity**: MEDIUM
**Location**: Multiple API routes
**Description**:
- API routes accept resource IDs from client without proper validation
- No validation that authenticated user has permission to access specific resources
- Potential for unauthorized access to other users' data

**Impact**:
- Users may access data they shouldn't have access to
- Data privacy violations

**Required Fix**:
- Implement resource ownership/permission validation
- Validate all resource IDs against authenticated user's permissions
- Test for IDOR vulnerabilities

#### MEDIUM-002: Missing Rate Limiting on Sensitive Operations
**Severity**: MEDIUM
**Location**: `src/lib/rate-limit.ts`, API routes
**Description**:
- Rate limiting only implemented on login endpoint
- No rate limiting on other sensitive operations (PIN auth, password reset, etc.)
- Potential for brute force attacks

**Impact**:
- Increased risk of credential stuffing
- Potential for denial of service
- Brute force attacks on sensitive operations

**Required Fix**:
- Implement rate limiting on all sensitive operations
- Apply appropriate limits based on operation type

---

### LOW FINDINGS

#### LOW-001: Student Data Exposure
**Severity**: LOW
**Location**: Student API endpoints
**Description**:
- Student data endpoints may return more information than needed
- No clear data minimization policy
- Potential exposure of sensitive student information

**Impact**:
- Privacy violations
- Unnecessary exposure of sensitive data

**Required Fix**:
- Implement data minimization
- Create explicit DTOs for different roles
- Restrict sensitive fields based on role

#### LOW-002: Missing Audit Logs for Administrative Actions
**Severity**: LOW
**Location**: Administrative API endpoints
**Description**:
- Some administrative actions not properly audited
- Incomplete audit trail for sensitive operations

**Impact**:
- Reduced accountability
- Harder to investigate security incidents

**Required Fix**:
- Implement comprehensive audit logging
- Ensure all privileged operations are logged

---

## 3. IMPLEMENTATION PHASES

### Phase 1: Repository Security Audit (COMPLETED)
- ✅ Identify authentication implementation
- ✅ Identify login flow
- ✅ Identify password/PIN handling
- ✅ Identify session handling
- ✅ Identify role/permission handling
- ✅ Identify API routes
- ✅ Identify database queries
- ✅ Identify Supabase configuration
- ✅ Identify RLS policies
- ✅ Identify sensitive data access patterns

### Phase 2: Authentication/Security Architecture (IN PROGRESS)
- [x] Implement account status validation
- [ ] Implement session invalidation on role changes
- [ ] Fix operator ID forgery vulnerability
- [ ] Implement centralized authorization middleware

### Phase 3: Account States
- [ ] Implement explicit account states (ACTIVE, LOCKED, SUSPENDED, DISABLED, DEPROVISIONED)
- [ ] Implement session revocation on status changes

### Phase 4: Password/PIN Security
- [ ] Review password hashing implementation
- [ ] Review PIN security implementation

### Phase 5: Central Authorization
- [ ] Implement centralized authorization middleware
- [ ] Implement permission-based authorization

### Phase 6: Role/Permission Migration
- [ ] Define explicit permissions for each role
- [ ] Implement privilege ceiling enforcement

### Phase 7: API Authorization
- [ ] Apply centralized authorization to all API routes
- [ ] Implement resource access validation

### Phase 8: Student/Parent Authorization
- [ ] Implement proper parent-child relationship validation
- [ ] Implement data minimization for student data

### Phase 9: Gate Scan Authorization
- [ ] Fix operator ID forgery
- [ ] Implement proper gate access validation

### Phase 10: RLS Implementation
- [ ] Implement Row Level Security policies
- [ ] Test RLS enforcement

### Phase 11: Immutable Logs
- [ ] Implement immutable gate logs
- [ ] Implement correction workflow

### Phase 12: Device/Session Security
- [ ] Implement device tracking
- [ ] Implement session management

### Phase 13: Rate Limiting
- [ ] Implement comprehensive rate limiting

### Phase 14: Security Alerts
- [ ] Implement security event mechanism

### Phase 15: Frontend Authentication Cleanup
- [ ] Remove frontend authentication authority
- [ ] Clean up frontend auth state

### Phase 16: Adversarial Testing
- [ ] Perform security testing
- [ ] Test for IDOR vulnerabilities
- [ ] Test for authentication bypass

### Phase 17: Documentation
- [ ] Create security architecture documentation
- [ ] Create authorization matrix
- [ ] Create security test plan

---

## 4. NEXT STEPS

1. **Fix CRITICAL-002**: Implement session invalidation on role changes
2. **Fix HIGH-001**: Fix operator ID forgery vulnerability
3. **Fix HIGH-002**: Implement centralized authorization middleware
4. **Fix MEDIUM-001**: Implement IDOR protection

**Priority Order**: CRITICAL issues first, then HIGH, then MEDIUM/LOW

---

## 5. SECURITY ACCEPTANCE CHECKLIST

[ ] Frontend cannot authenticate users independently
[ ] Frontend cannot grant roles
[ ] Frontend cannot grant permissions
[ ] No demo authentication
[ ] No hardcoded production credentials
[ ] Passwords hashed
[ ] PINs hashed
[ ] Initial credentials are controlled
[ ] Forgotten-password flow verifies ownership
[ ] Sessions are secure
[ ] Sessions are revocable
[x] Role changes revoke sessions
[x] Disabled accounts lose access
[ ] Operator identity comes from authenticated session
[ ] Gate authorization is backend enforced
[ ] Student authorization is backend enforced
[ ] Parent-child authorization is backend enforced
[ ] IDOR protection tested
[ ] RLS enabled
[ ] Service-role key never reaches client
[ ] TLS enforced in production
[ ] Sensitive data minimized
[ ] Original gate logs immutable
[ ] Audit logs append-only
[ ] Corrections auditable
[ ] Suspicious corrections generate alerts
[ ] Rate limiting implemented
[ ] Account lock implemented
[ ] Device/session revocation implemented
[ ] Server timestamps used
[ ] API input validated
[ ] Sensitive responses use explicit DTOs
[ ] No secrets in Git
[x] Security tests pass
