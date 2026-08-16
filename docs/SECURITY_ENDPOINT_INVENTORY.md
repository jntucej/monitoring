# Security Endpoint Inventory

**Generated:** 2026-08-16  
**Scope:** All API routes in `/gate-monitor/src/app/api`  
**Methodology:** Direct source code analysis (not documentation)

---

## Endpoint Summary

| # | Method | Route | Auth Required | Required Role(s) | Permission | Resource | Auth Source | Status Check | Resource Auth | RLS | Rate Limit | Audit Log | PII Returned | Risk |
|---|--------|-------|---------------|------------------|------------|----------|-------------|--------------|---------------|-----|------------|-----------|--------------|------|

---

## 1. Authentication Endpoints

### 1.1 POST /api/auth/login
- **Authentication Required:** No (public login)
- **Required Role(s):** None
- **Permission:** N/A
- **Resource:** User authentication
- **User Identity Source:** Supabase Auth (email/password) → public.users lookup
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** Yes (profile.status === 'ACTIVE')
- **Resource Authorization Check:** N/A
- **RLS Dependency:** No (uses service client for auth)
- **Rate Limiting:** Yes (5 req/hr per IP)
- **Audit Logging:** No (login itself not audited here)
- **PII Returned:** User ID, name, role, gateId, employeeId, loginIdentifier
- **Security Risk:** MEDIUM - Legacy JWT_SECRET used for token signing (see auth.ts)

### 1.2 POST /api/auth/pin-login
- **Authentication Required:** No (public login)
- **Required Role(s):** None
- **Permission:** N/A
- **Resource:** User authentication via PIN
- **User Identity Source:** public.users lookup by employeeId → PIN verification
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** Yes (findUserByLogin filters status='ACTIVE')
- **Resource Authorization Check:** N/A
- **RLS Dependency:** No (direct DB queries)
- **Rate Limiting:** Yes (5 req/hr per IP)
- **Audit Logging:** No
- **PII Returned:** User ID, name, role, gateId, employeeId
- **Security Risk:** HIGH - Uses custom JWT signing with JWT_SECRET (legacy auth), PIN verification against DB, creates custom sessions table

### 1.3 POST /api/auth/logout
- **Authentication Required:** Yes (Bearer token)
- **Required Role(s):** Any authenticated
- **Permission:** Session invalidation
- **Resource:** User session
- **User Identity Source:** Authorization header token
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** No
- **Resource Authorization Check:** No (any valid token can invalidate itself)
- **RLS Dependency:** No (direct DB update on sessions table)
- **Rate Limiting:** No
- **Audit Logging:** No
- **PII Returned:** None
- **Security Risk:** LOW

### 1.4 GET /api/auth/session
- **Authentication Required:** Yes (Bearer token)
- **Required Role(s):** Any authenticated
- **Permission:** Session validation
- **Resource:** User session
- **User Identity Source:** Custom JWT verification (verifyToken) → sessions table lookup
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** No
- **Resource Authorization Check:** No
- **RLS Dependency:** No (direct DB queries)
- **Rate Limiting:** No
- **Audit Logging:** No
- **PII Returned:** User ID, name, role, gateId, employeeId
- **Security Risk:** HIGH - Uses legacy JWT_SECRET verification, custom session table

---

## 2. User Management Endpoints

### 2.1 GET /api/users
- **Authentication Required:** Yes (withAuthAndStatus + withAuthorization)
- **Required Role(s):** admin, sysadmin
- **Permission:** users:list
- **Resource:** All users
- **User Identity Source:** x-user-id, x-user-role headers (set by auth middleware)
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** Yes (withAuthAndStatus validates ACTIVE)
- **Resource Authorization Check:** Role check in handler (userRole !== 'admin' && userRole !== 'sysadmin')
- **RLS Dependency:** Yes (users table RLS: admins can view all)
- **Rate Limiting:** Yes (30 req/hr per IP)
- **Audit Logging:** No
- **PII Returned:** All user fields (name, email, role, status, gateId, employeeId, etc.)
- **Security Risk:** MEDIUM - Trusts x-user-role header set by middleware; no re-validation of role from DB in handler

### 2.2 POST /api/users
- **Authentication Required:** Yes (withAuthAndStatus + withAuthorization)
- **Required Role(s):** admin, sysadmin
- **Permission:** users:create
- **Resource:** New user
- **User Identity Source:** x-user-id, x-user-role headers
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** Yes
- **Resource Authorization Check:** Role check in handler
- **RLS Dependency:** Yes (users table RLS: admins can insert)
- **Rate Limiting:** Yes (10 req/hr per IP)
- **Audit Logging:** Yes (createUser calls addAudit)
- **PII Returned:** Created user data
- **Security Risk:** HIGH - createUser hashes password with bcrypt (legacy), stores password_hash in DB despite Supabase Auth migration claiming to remove it

### 2.3 PATCH /api/users/[id]
- **Authentication Required:** Yes (withAuthAndStatus + withAuthorization)
- **Required Role(s):** admin, sysadmin
- **Permission:** users:update
- **Resource:** Target user
- **User Identity Source:** x-user-id, x-user-role headers
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** Yes
- **Resource Authorization Check:** Role check + self-modification prevention (targetUserId === userId)
- **RLS Dependency:** Yes (users table RLS: admins can update, sysadmins can update roles)
- **Rate Limiting:** Yes (20 req/hr per IP)
- **Audit Logging:** Yes (updateUserRole, updateAccountStatus call addAudit)
- **PII Returned:** Updated user data
- **Security Risk:** MEDIUM - Role/status updates revoke sessions but use custom sessions table

---

## 3. Student Endpoints

### 3.1 GET /api/students
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** All students / search / single by roll
- **User Identity Source:** N/A (no auth)
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (students table RLS policies)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** FULL student record (id, roll, name, department, year, section, batch, photo, email, phone, parentName, parentPhone, parentId, qrCode, idValidUntil, status)
- **Security Risk:** CRITICAL - No authentication, no authorization, returns full PII including parent phone, email, photo, QR code

### 3.2 GET /api/students/[roll]
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Single student + status + history
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (students table RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** FULL student record + campus status + last scan + 20 history entries
- **Security Risk:** CRITICAL - No authentication, returns full PII + movement history

---

## 4. Gate Pass Endpoints

### 4.1 GET /api/passes
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Gate passes (filterable by status, roll, parentId)
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (gate_passes table RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Pass data including student name, roll, department, reason, dates, requestedBy info
- **Security Risk:** HIGH - No authentication, parentId filter allows enumeration

### 4.2 POST /api/passes
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Create gate pass
- **User Identity Source:** Client-provided requestedById, requestedByName (TRUSTED!)
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO (anyone can create pass for any student by roll)
- **RLS Dependency:** Yes (gate_passes table RLS for INSERT)
- **Rate Limiting:** NO
- **Audit Logging:** Yes (trigger on insert)
- **PII Returned:** Created pass with student details
- **Security Risk:** CRITICAL - Client controls requestedById/requestedByName, no auth, anyone can create passes

### 4.3 GET /api/passes/[passId]
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Single gate pass
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (gate_passes table RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Full pass details
- **Security Risk:** HIGH - No authentication

### 4.4 PUT /api/passes/[passId]
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Approve/reject gate pass
- **User Identity Source:** Client-provided by, approverId (TRUSTED!)
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO (client controls action, by, comment, approverId)
- **RLS Dependency:** Yes (gate_passes table RLS for UPDATE)
- **Rate Limiting:** NO
- **Audit Logging:** Yes (trigger on update)
- **PII Returned:** Updated pass
- **Security Risk:** CRITICAL - Client controls approver identity, action, no authorization

---

## 5. Admin Endpoints

### 5.1 GET /api/admin/dashboard
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Dashboard statistics
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (queries multiple tables with RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Aggregated stats, alerts, passes, gate activity
- **Security Risk:** HIGH - No authentication for admin dashboard

---

## 6. Supervisor Endpoints

### 6.1 GET /api/supervisor/corrections
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Correction candidates + live gates
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (gate_logs, gates tables RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Scan data with student names, rolls, departments
- **Security Risk:** HIGH - No authentication

### 6.2 POST /api/supervisor/corrections
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Correct scan
- **User Identity Source:** Client-provided userId, userName, role (TRUSTED!)
- **Operator Identity Source:** Client-provided (defaults to "sv-1", "Supervisor", "supervisor")
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO (client controls logId, newDirection, newReason, reason, userId, userName, role)
- **RLS Dependency:** Yes (gate_logs table RLS for INSERT)
- **Rate Limiting:** NO
- **Audit Logging:** Yes (addAudit in correctScan)
- **PII Returned:** Corrected scan
- **Security Risk:** CRITICAL - Client controls operator identity, role, no authorization

### 6.3 GET /api/supervisor/live-events
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Today's scans (live feed)
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (gate_logs table RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Student name, roll, gate, timestamp, direction
- **Security Risk:** HIGH - No authentication, exposes all student movements

---

## 7. Alerts & Notifications

### 7.1 GET /api/alerts
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Alerts (filterable by resolved, severity)
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (alerts table RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Alert details (may include student roll, gate)
- **Security Risk:** MEDIUM - No authentication

### 7.2 GET /api/notifications
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Notifications (filterable by recipient type, id)
- **User Identity Source:** N/A (client controls type and id params)
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO (client can request any recipient type/id)
- **RLS Dependency:** Yes (notifications table RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Notification content
- **Security Risk:** HIGH - Client controls recipient type/id, can enumerate notifications

---

## 8. Gate Logs Endpoints

### 8.1 GET /api/gate/logs
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Gate logs (filterable by gateId, date, direction, reason, search, pagination)
- **User Identity Source:** N/A
- **Operator Identity Source:** N/A
- **Gate Identity Source:** N/A
- **Account Status Check:** NO
- **Resource Authorization Check:** NO
- **RLS Dependency:** Yes (gate_logs table RLS)
- **Rate Limiting:** NO
- **Audit Logging:** NO
- **PII Returned:** Full scan logs with student names, rolls, departments, operator names
- **Security Risk:** HIGH - No authentication, exposes all movement history

### 8.2 POST /api/gate/logs
- **Authentication Required:** NO (no middleware)
- **Required Role(s):** None
- **Permission:** None
- **Resource:** Bulk insert scans (offline queue flush)
- **User Identity Source:** Client-provided operatorId in each scan (TRUSTED!)
- **Operator Identity Source:** Client-provided operatorId
- **Gate Identity Source:** Client-provided gateId
- **Account Status Check:** NO
- **Resource Authorization Check:** NO (client controls all scan fields including operatorId)
- **RLS Dependency:** Yes (gate_logs table RLS for INSERT)
- **Rate Limiting:** NO
- **Audit Logging:** Yes (trigger on insert)
- **PII Returned:** Results of bulk insert
- **Security Risk:** CRITICAL - Client controls operatorId, gateId, roll, direction - complete forgery possible

---

## 9. Gate Scan Endpoint (Protected)

### 9.1 POST /api/gate/scan
- **Authentication Required:** YES (withAuthorization with requiredRole: ['operator', 'supervisor'])
- **Required Role(s):** operator, supervisor
- **Permission:** gate:create (via resource validation)
- **Resource:** Gate scan
- **User Identity Source:** Auth context from withAuthorization (derived from Supabase token)
- **Operator Identity Source:** auth.userId (server-derived, NOT client-provided)
- **Gate Identity Source:** Client-provided gateId (validated against auth.gateId/supervised_gates)
- **Account Status Check:** Yes (withAuthorization validates ACTIVE)
- **Resource Authorization Check:** Yes (validateGateAccess checks operator gate assignment / supervisor gates)
- **RLS Dependency:** Yes (gate_logs table RLS)
- **Rate Limiting:** Yes (30 req/hr per IP)
- **Audit Logging:** Yes (logAuditEvent on success/failure)
- **PII Returned:** Minimal scan data (roll, name, department, direction, gate, timestamp)
- **Security Risk:** LOW - Properly protected, server-derived identity, resource authorization

### 9.2 GET /api/gate/scan
- **Authentication Required:** YES (withAuthorization with requiredRole: ['operator', 'supervisor', 'admin', 'sysadmin'])
- **Required Role(s):** operator, supervisor, admin, sysadmin
- **Permission:** gate:read
- **Resource:** Gate statistics
- **User Identity Source:** Auth context from withAuthorization
- **Operator Identity Source:** N/A
- **Gate Identity Source:** Filtered by auth.gateId/supervised_gates
- **Account Status Check:** Yes
- **Resource Authorization Check:** Yes (gates filtered by role)
- **RLS Dependency:** Yes
- **Rate Limiting:** Yes (60 req/hr per IP)
- **Audit Logging:** No
- **PII Returned:** Aggregated stats + gate list (filtered)
- **Security Risk:** LOW - Properly protected

---

## Summary: Unprotected Endpoints (CRITICAL FINDINGS)

| Endpoint | Missing Auth | Missing AuthZ | Client-Controlled Identity | PII Exposure |
|----------|--------------|---------------|---------------------------|--------------|
| GET /api/students | ✅ | ✅ | N/A | FULL |
| GET /api/students/[roll] | ✅ | ✅ | N/A | FULL + history |
| GET /api/passes | ✅ | ✅ | parentId filter | Pass data |
| POST /api/passes | ✅ | ✅ | requestedById, requestedByName | Student PII |
| PUT /api/passes/[passId] | ✅ | ✅ | by, approverId, action | Pass data |
| GET /api/admin/dashboard | ✅ | ✅ | N/A | Aggregated |
| GET /api/supervisor/corrections | ✅ | ✅ | N/A | Scan data |
| POST /api/supervisor/corrections | ✅ | ✅ | userId, userName, role | Scan data |
| GET /api/supervisor/live-events | ✅ | ✅ | N/A | Student movements |
| GET /api/alerts | ✅ | ✅ | N/A | Alert data |
| GET /api/notifications | ✅ | ✅ | type, id params | Notifications |
| GET /api/gate/logs | ✅ | ✅ | N/A | Full scan history |
| POST /api/gate/logs | ✅ | ✅ | operatorId, gateId, roll | Scan creation |

**Total Unprotected Endpoints: 13 out of 17 (76%)**

---

## Protected Endpoints (4 out of 17)

| Endpoint | Auth | AuthZ | Server-Derived Identity | Resource Auth |
|----------|------|-------|------------------------|---------------|
| POST /api/gate/scan | ✅ | ✅ | ✅ (auth.userId) | ✅ |
| GET /api/gate/scan | ✅ | ✅ | ✅ | ✅ (gate filtering) |
| GET /api/users | ✅ | ✅ | ⚠️ (header trust) | ⚠️ (role check only) |
| POST /api/users | ✅ | ✅ | ⚠️ (header trust) | ⚠️ (role check only) |
| PATCH /api/users/[id] | ✅ | ✅ | ⚠️ (header trust) | ⚠️ (role check + self-check) |

---

## Authentication Architecture Issues

### Dual Authentication Systems
1. **Supabase Auth** (modern): Used by `/api/auth/login`, `/api/gate/scan`, auth middleware
2. **Legacy Custom JWT** (legacy): Used by `/api/auth/pin-login`, `/api/auth/session`, `/api/auth/logout`
   - JWT_SECRET in environment
   - Custom sessions table
   - bcrypt password/PIN hashing in DB
   - signToken/verifyToken in auth.ts

### Legacy Code Still Active
- `gate-monitor/src/lib/auth.ts` - Custom JWT signing/verification
- `gate-monitor/src/lib/db.ts` - verifyLogin, verifyPin, createSession, hashPin, bcrypt usage
- `gate-monitor/src/app/api/auth/pin-login/route.ts` - PIN login with custom JWT
- `gate-monitor/src/app/api/auth/session/route.ts` - Session validation with custom JWT
- `gate-monitor/src/app/api/auth/logout/route.ts` - Session invalidation
- `gate-monitor/src/app/api/users/route.ts` - createUser hashes password with bcrypt

### Service Role Key
- **NOT in client bundle** ✅ (only NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local)
- **Used server-side** in supabaseClient.ts for admin operations (invalidateAllUserSessions)
- **Not exposed** in any client-facing code ✅

---

## RLS Policy Coverage

| Table | RLS Enabled | Policies | Gaps |
|-------|-------------|----------|------|
| users | ✅ | 5 policies | No policy for sysadmin user creation |
| students | ✅ | 4 policies | No operator policy (operators use getGateStudentInfo RPC) |
| gates | ✅ | 2 policies | - |
| gate_logs | ✅ | 2 policies | No supervisor policy (only operator + admin) |
| gate_passes | ✅ | 3 policies | - |
| alerts | ✅ | 2 policies | No operator policy |
| audit_logs | ✅ | 1 policy | Only sysadmin can SELECT; no INSERT policy (triggers handle) |
| notifications | ✅ | 2 policies | - |
| sessions | ✅ | 2 policies | - |
| campus_occupancy | ✅ | 1 policy | Only admin |

---

## SECURITY DEFINER Functions (from migrations)

| Function | Purpose | Search Path | Auth Check | Risk |
|----------|---------|-------------|------------|------|
| update_campus_occupancy_on_scan | Trigger | - | None (trigger) | LOW |
| create_audit_log_on_scan | Trigger | - | None (trigger) | LOW |
| create_audit_log_on_pass | Trigger | - | None (trigger) | LOW |
| create_audit_log_on_pass_update | Trigger | - | None (trigger) | LOW |
| create_audit_log_on_user | Trigger | - | None (trigger) | LOW |
| create_audit_log_on_user_role_update | Trigger | - | Uses current_setting | MEDIUM |
| create_audit_log_on_account_status_update | Trigger | - | None (trigger) | LOW |
| user_student_mapping | RLS helper | - | None | MEDIUM |
| is_admin | Helper | - | None | LOW |
| is_sysadmin | Helper | - | None | LOW |
| resolve_login_identifier | Login resolution | - | None | LOW |
| can_user_authenticate | Auth validation | - | None | LOW |
| create_user_with_auth | User creation | - | None | HIGH (SECURITY DEFINER) |
| delete_user_with_auth | User deletion | - | None | HIGH (SECURITY DEFINER) |
| invalidate_all_user_sessions | Session revocation | - | Uses current_setting | MEDIUM |

---

## Rate Limiting Coverage

| Endpoint | Rate Limit | Key | Window | Block |
|----------|------------|-----|--------|-------|
| POST /api/auth/login | 5/hr | IP | 1 hr | 15 min |
| POST /api/auth/pin-login | 5/hr | IP | 1 hr | 15 min |
| GET /api/users | 30/hr | IP | 1 hr | 15 min |
| POST /api/users | 10/hr | IP | 1 hr | 15 min |
| PATCH /api/users/[id] | 20/hr | IP | 1 hr | 15 min |
| POST /api/gate/scan | 30/hr | IP | 1 hr | 15 min |
| GET /api/gate/scan | 60/hr | IP | 1 hr | 15 min |
| **All other endpoints** | **NONE** | - | - | - |

**Rate limiting only on 7 of 17 endpoints (41%)**

---

## Fail-Closed Analysis

| Location | Pattern | Risk |
|----------|---------|------|
| authMiddleware.ts:34-39 | `if (authError || !user) return 401` | ✅ Fail-closed |
| authMiddleware.ts:42-49 | `if (!canAuthenticate) return 401` | ✅ Fail-closed |
| authMiddleware.ts:58-71 | `if (profileError || !profile) return 404` | ✅ Fail-closed |
| authMiddleware.ts:66-71 | `if (profile.status !== 'ACTIVE') return 403` | ✅ Fail-closed |
| withAuthorization.ts:44-48 | `if (!authHeader) return 401` | ✅ Fail-closed |
| withAuthorization.ts:54 | `const authContext = await requireAuthUser(token)` | ✅ Throws on fail |
| withAuthorization.ts:57-62 | `if (!options.allowInactive && !authContext.isActive) return 403` | ✅ Fail-closed |
| withAuthorization.ts:65-75 | Role check throws 403 | ✅ Fail-closed |
| withAuthorization.ts:114-144 | Catch block defaults to 500 | ⚠️ Should be 401/403 |
| authContext.ts:64-74 | Returns unauthenticated context on authError | ⚠️ Should throw |
| authContext.ts:83-93 | Returns unauthenticated context on profileError | ⚠️ Should throw |
| authContext.ts:96-106 | Returns disabled context on ID mismatch | ✅ Fail-closed |
| db.ts:727-750 | verifyLogin returns null on any error | ✅ Fail-closed |
| db.ts:752-775 | verifyPin returns false on any error | ✅ Fail-closed |

---

## CSRF Analysis

- **Authentication Mechanism:** Bearer tokens (Authorization header)
- **Cookies Used:** No (Supabase Auth uses localStorage/IndexedDB for tokens)
- **CSRF Risk:** LOW - Bearer tokens in Authorization header not automatically sent by browser
- **SameSite/CSRF Tokens:** Not applicable for bearer token auth
- **Origin Validation:** Not implemented (not needed for bearer tokens)

---

## PII Exposure Summary

### High Exposure (Unprotected Endpoints)
- **GET /api/students** - Full student records: name, roll, department, year, section, batch, photo, email, phone, parentName, parentPhone, parentId, qrCode, idValidUntil
- **GET /api/students/[roll]** - Above + campus status + 20 scan history entries
- **GET /api/gate/logs** - All scans with student names, rolls, departments, operator names
- **GET /api/supervisor/live-events** - Real-time student movements
- **POST /api/passes** - Creates passes with student PII, client controls requester identity

### Minimal Exposure (Protected Endpoints)
- **POST /api/gate/scan** - Returns only: roll, name, department, direction, gate, timestamp (minimal for verification)
- **GET /api/gate/scan** - Aggregated stats only

---

## Final Risk Assessment

| Category | Count | Severity |
|----------|-------|----------|
| Unprotected endpoints | 13/17 | CRITICAL |
| Legacy auth system active | 5 endpoints | HIGH |
| Client-controlled identity fields | 6 endpoints | CRITICAL |
| No rate limiting | 10/17 endpoints | HIGH |
| PII exposure on unprotected endpoints | 5 endpoints | CRITICAL |
| Missing audit logging | 10/17 endpoints | MEDIUM |
| SECURITY DEFINER functions without auth | 3 functions | MEDIUM |
| Dual authentication systems | 2 systems | HIGH |

**OVERALL: NOT SAFE FOR DEPLOYMENT**