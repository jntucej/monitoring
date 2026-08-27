# ARCHITECTURE BASELINE - Gate Monitoring System

## 1. SYSTEM OVERVIEW

**Name**: Gate Monitoring System
**Purpose**: Student gate access control and monitoring system for educational institutions
**Architecture**: Backend-authoritative system with Next.js frontend and Supabase backend
**Current Status**: Prototype/Refactoring mode transitioning to Operational POC

## 2. FRAMEWORK AND TECHNOLOGY STACK

### 2.1 Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI Components**: Custom React components with Tailwind CSS
- **State Management**: React hooks and custom stores

### 2.2 Backend/API
- **Framework**: Next.js API routes
- **Language**: TypeScript
- **Authentication**: Custom JWT-based authentication with Supabase integration
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)

### 2.3 Infrastructure
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (partially integrated)
- **Hosting**: Vercel (Next.js hosting)

## 3. KEY COMPONENTS

### 3.1 Authentication System
**File**: `gate-monitor/src/lib/auth.ts`
**Functions**:
- `signToken(user: User, sessionId: string)`: Creates JWT token with session ID for authenticated user
- `verifyToken(token: string)`: Verifies JWT token and extracts user information including session ID
- `getSessionUser(request: Request)`: Extracts user from session token

**Trust Boundary**: Client → API Gateway → Authentication Middleware
**Authentication Method**: JWT tokens with 7-day expiration and database-backed sessions
**Status**: Enhanced with session management and validation

### 3.2 Database Access Layer
**File**: `gate-monitor/src/lib/db.ts`
**Key Functions**:
- `findUserByLogin(login: string)`: Finds user by login credentials (filters by ACTIVE status)
- `verifyLogin(login: string, password: string)`: Verifies user credentials (checks ACTIVE status)
- `findUserById(id: string)`: Finds user by ID (no status filtering)
- `updateAccountStatus(userId: string, newStatus: AccountStatus)`: Updates account status and revokes sessions
- `revokeAllSessions(userId: string)`: Revokes all active sessions for a user
- `addScan(input: ScanInput)`: Records gate scan events
- `addAudit(input: AuditInput)`: Records audit events

**Trust Boundary**: Application → Database
**Database Access**: Direct Supabase client usage
**Status**: Core functionality implemented, needs security hardening

### 3.3 Middleware
**File**: `gate-monitor/src/middleware/auth.ts`
**Functions**:
- `authMiddleware(req: NextRequest)`: Validates JWT tokens, sessions, and attaches user info to headers
- `withAuth(handler: Function)`: Higher-order function for protecting API routes with authentication
- `withAuthAndStatus(handler: Function)`: Higher-order function combining authentication and account status validation

**Trust Boundary**: API Gateway → Protected Routes
**Status**: Enhanced with session validation and account status checking

### 3.4 Authorization Middleware
**File**: `gate-monitor/src/middleware/authorization.ts`
**Functions**:
- `withAuthorization(handler: Function, options)`: Higher-order function for role-based authorization
- `requireRole(requiredRole)`: Helper for role-based access control
- `requirePermission(requiredPermission)`: Helper for permission-based access control
- `withAccountStatusValidation(handler: Function)`: Validates account status on every request

**Trust Boundary**: API Gateway → Protected Routes
**Status**: Implemented for centralized authorization

### 3.4 API Routes
**Directory**: `gate-monitor/src/app/api/`
**Key Routes**:
- `/api/auth/login`: User authentication
- `/api/auth/logout`: Session termination
- `/api/gate/scan`: Gate scan operations
- `/api/students/[roll]`: Student data access
- `/api/admin/dashboard`: Administrative dashboard

**Trust Boundary**: Client → API Endpoints
**Status**: Basic implementation, needs security hardening

## 4. SECURITY-SENSITIVE COMPONENTS

### 4.1 Authentication Components

| FILE | FUNCTION | PURPOSE | TRUST BOUNDARY | INPUT | AUTHENTICATION | AUTHORIZATION | DATABASE ACCESS | AUDIT BEHAVIOR |
|------|----------|---------|----------------|-------|----------------|---------------|-----------------|----------------|
| `auth.ts` | `signToken` | Creates JWT token with session ID | Client → API | User object, session ID | N/A | N/A | No | No |
| `auth.ts` | `verifyToken` | Verifies JWT token and extracts session ID | API Gateway | Token | Validates token | N/A | No | No |
| `auth.ts` | `getSessionUser` | Extracts user from session | API Gateway | Request | Validates token | N/A | Yes (findUserById) | No |
| `db.ts` | `findUserByLogin` | Finds user by login | API → Database | Login string | N/A | Filters by ACTIVE status | Yes | No |
| `db.ts` | `verifyLogin` | Verifies credentials | API → Database | Login, password | Validates credentials | Validates ACTIVE status | Yes | No |
| `db.ts` | `updateAccountStatus` | Updates account status | API → Database | User ID, status | Validates admin role | Validates admin role | Yes | Yes (ACCOUNT_STATUS_CHANGED) |
| `db.ts` | `revokeAllSessions` | Revokes sessions | API → Database | User ID | Validates admin role | Validates admin role | Yes | Yes (ALL_SESSIONS_REVOKED) |

### 4.2 Gate Operation Components

| FILE | FUNCTION | PURPOSE | TRUST BOUNDARY | INPUT | AUTHENTICATION | AUTHORIZATION | DATABASE ACCESS | AUDIT BEHAVIOR |
|------|----------|---------|----------------|-------|----------------|---------------|-----------------|----------------|
| `api/gate/scan/route.ts` | `handlePost` | Records gate scan | Client → API | Scan data | Validates token and session | Validates operator role and account status | Yes | Yes (SCAN_CREATED) |
| `db.ts` | `addScan` | Records scan event | API → Database | Scan data | Validates operator via authenticated ID | Validates operator | Yes | Yes (SCAN_CREATED) |
| `db.ts` | `correctScan` | Corrects scan event | API → Database | Correction data | Validates user and session | Validates role and account status | Yes | Yes (SCAN_CORRECTED) |

### 4.3 Account Management Components

| FILE | FUNCTION | PURPOSE | TRUST BOUNDARY | INPUT | AUTHENTICATION | AUTHORIZATION | DATABASE ACCESS | AUDIT BEHAVIOR |
|------|----------|---------|----------------|-------|----------------|---------------|-----------------|----------------|
| `db.ts` | `findUserById` | Finds user by ID | API → Database | User ID | N/A | N/A | Yes | No |
| `db.ts` | `approvePass` | Approves gate pass | API → Database | Pass ID, role | Validates user | Validates role | Yes | Yes (GATE_PASS_APPROVED) |
| `db.ts` | `rejectPass` | Rejects gate pass | API → Database | Pass ID, role | Validates user | Validates role | Yes | Yes (GATE_PASS_REJECTED) |

## 5. TRUST BOUNDARIES AND SECURITY MODEL

### 5.1 Trust Boundaries

```
[Client] ←untrusted→ [API Gateway] ←trusted→ [Authentication Middleware] ←trusted→ [API Routes] ←trusted→ [Database]
```

1. **Client ↔ API Gateway**: Untrusted boundary - all client input must be validated
2. **API Gateway ↔ Authentication Middleware**: Trusted boundary - authentication validation
3. **Authentication Middleware ↔ API Routes**: Trusted boundary - authorization validation
4. **API Routes ↔ Database**: Trusted boundary - data access validation

### 5.2 Security Model

**Authentication Flow**:
1. Client sends credentials to `/api/auth/login`
2. Server validates credentials and account status
3. Server creates JWT token and session
4. Client receives token for subsequent requests

**Authorization Flow**:
1. Client sends request with JWT token
2. Middleware validates token and extracts user information
3. API route validates user role and permissions
4. API route validates resource access rights
5. Business logic executes if authorized

**Session Management**:
- JWT tokens with 7-day expiration and embedded session IDs
- Database-backed sessions with validation
- Session revocation on account status changes
- Session revocation on role changes (implemented)
- Session validation on every authenticated request

## 6. ROLE MODEL

| ROLE | DESCRIPTION | PERMISSIONS | TRUST LEVEL |
|------|-------------|-------------|-------------|
| `sysadmin` | System Administrator | Highest system authority, can manage system-level accounts and security controls | Highest |
| `admin` | Administrator | Administrative authority, can manage users, students, operational configuration | High |
| `operator` | Operator | Gate scanning/verification authority, can perform gate operations | Medium |
| `student` | Student | Can access only their own permitted information | Low |
| `parent` | Parent | Can access only linked child/children information | Low |

## 7. ACCOUNT STATUS MODEL

| STATUS | DESCRIPTION | AUTHENTICATION ALLOWED | SESSION VALIDITY |
|--------|-------------|------------------------|------------------|
| `ACTIVE` | Normal operational status | ✅ Yes | ✅ Valid |
| `LOCKED` | Temporary lock (e.g., failed login attempts) | ❌ No | ❌ Invalidated |
| `SUSPENDED` | Administrative suspension | ❌ No | ❌ Invalidated |
| `DISABLED` | Permanent disablement | ❌ No | ❌ Invalidated |
| `DEPROVISIONED` | Account deprovisioned | ❌ No | ❌ Invalidated |

## 8. DATABASE ARCHITECTURE

### 8.1 Key Tables

| TABLE | PURPOSE | SECURITY NOTES |
|-------|---------|----------------|
| `users` | User accounts | Contains hashed passwords, PINs, roles, status |
| `sessions` | Active user sessions | Tracks active sessions, revocation status |
| `students` | Student records | Contains sensitive student information |
| `gate_logs` | Gate scan events | Immutable security records |
| `audit_logs` | Audit trail | Append-only security evidence |
| `gate_passes` | Gate pass requests | Tracks pass approval workflow |
| `campus_occupancy` | Student presence tracking | Real-time student location data |

### 8.2 Row Level Security (RLS)

**Current Status**: Not fully implemented
**Required**: Implement comprehensive RLS policies for all security-sensitive tables

## 9. SECURITY FINDINGS AND RISKS

### 9.1 Critical Issues

1. **CRITICAL-001**: Missing Account Status Validation (FIXED)
   - **Status**: Fixed - Account status validation implemented in middleware and API routes
   - **Risk**: Mitigated - Sessions are validated on every request

2. **CRITICAL-002**: No Session Invalidation on Role Changes (FIXED)
   - **Status**: Fixed - Session invalidation implemented in `updateUserRole` function
   - **Risk**: Mitigated - All active sessions revoked on role changes

3. **HIGH-001**: Operator ID Forgery Vulnerability (FIXED)
   - **Location**: `/api/gate/scan` route
   - **Status**: Fixed - Operator ID derived from authenticated session, not client input
   - **Risk**: Mitigated - Operator impersonation prevented

### 9.2 High Issues

1. **HIGH-002**: No Centralized Authorization Middleware (FIXED)
   - **Status**: Fixed - Centralized authorization middleware implemented
   - **Risk**: Mitigated - Consistent authorization enforcement across API routes

2. **HIGH-003**: Incomplete Session Validation (FIXED)
   - **Status**: Fixed - Session middleware validates account status on every request
   - **Risk**: Mitigated - Inactive accounts cannot access protected routes

### 9.3 Medium Issues

1. **MEDIUM-001**: Insecure Direct Object Reference (IDOR) Risks (OPEN)
   - **Risk**: Potential unauthorized access to other users' data

2. **MEDIUM-002**: Missing Rate Limiting on Sensitive Operations (OPEN)
   - **Risk**: Brute force attacks on sensitive operations

## 10. SECURITY PRINCIPLES VERIFICATION

### 10.1 Backend-Authoritative Security

| PRINCIPLE | STATUS | NOTES |
|-----------|--------|-------|
| Authentication enforced by backend | ✅ Yes | JWT token validation with session validation in middleware |
| Authorization enforced by backend | ✅ Yes | Centralized authorization middleware implemented |
| Account status validation | ✅ Yes | Implemented in `findUserByLogin`, `verifyLogin`, and middleware |
| Session management | ✅ Yes | Database-backed sessions with validation and revocation |
| Audit logging | ✅ Yes | Audit events for security-sensitive operations |

### 10.2 Client Trust Model

| PRINCIPLE | STATUS | NOTES |
|-----------|--------|-------|
| Client never trusted | ✅ Yes | All client-provided IDs validated, operator ID forgery fixed |
| No frontend authentication | ✅ Yes | All authentication handled by backend |
| No frontend authorization | ✅ Yes | All authorization handled by backend |
| No client-controlled IDs | ✅ Yes | Operator ID derived from authenticated session, gate ID validated |

## 11. RECOMMENDATIONS FOR OPERATIONAL POC

1. **Immediate Fixes**:
   - ~~Implement session invalidation on role changes (CRITICAL-002)~~ ✅ COMPLETED
   - ~~Fix operator ID forgery vulnerability (HIGH-001)~~ ✅ COMPLETED
   - ~~Implement centralized authorization middleware (HIGH-002)~~ ✅ COMPLETED
   - ~~Add account status validation to session middleware~~ ✅ COMPLETED

2. **Security Hardening**:
   - Implement comprehensive RLS policies
   - Implement data minimization for student data
   - Implement rate limiting on all sensitive operations
   - Implement IDOR protection for all API endpoints

3. **Operational Readiness**:
   - Create synthetic test data for POC
   - Implement comprehensive audit logging
   - Implement security event monitoring
   - Create operational documentation

4. **Testing**:
   - Perform adversarial testing
   - Test for authentication bypass
   - Test for IDOR vulnerabilities
   - Test session invalidation scenarios

## 12. NEXT STEPS

1. ~~**Complete the forensic inspection** of remaining components~~ ✅ COMPLETED
2. ~~**Address critical security issues** before operational POC~~ ✅ COMPLETED
3. **Implement additional security hardening** based on findings
4. **Create comprehensive documentation** for operational POC
5. **Perform security testing** to validate fixes
6. **Prepare for operational deployment** with synthetic test data
