# API Security Model

This document defines the security model for the Gate Monitoring System API, including authentication, authorization, input validation, and security controls for each API endpoint.

## AUTHENTICATION MODEL

### Authentication Flow
```
Client Request → JWT Verification → Session Validation → Account Status Check → Role Validation → API Endpoint
```

### Authentication Requirements
1. **JWT Token**: All API requests must include a valid JWT token in the `Authorization` header
2. **Token Format**: `Bearer <token>`
3. **Token Validation**: Tokens must be validated using the server-side JWT secret
4. **Session Validation**: Tokens must be associated with an active session
5. **Account Status**: User account must be active (not suspended, disabled, or locked)
6. **Role Validation**: User role must be validated against current database state

### Authentication Middleware
- **Location**: `middleware/auth.ts`
- **Function**: `withAuth` middleware
- **Responsibilities**:
  - Verify JWT token signature
  - Validate token expiration
  - Extract user identity (uid, role, name)
  - Validate session against database
  - Check account status
  - Attach validated user information to request headers
  - Reject unauthenticated requests

## AUTHORIZATION MODEL

### Authorization Flow
```
Authenticated Request → Role Validation → Resource Authorization → Field-Level Filtering → Response
```

### Authorization Requirements
2. **Resource-Level Authorization**: Access to specific resources (students, gates, passes) based on ownership and permissions
3. **Field-Level Security**: Only return fields appropriate for the user's role
4. **Gate Context Validation**: Operators can only perform operations on gates they're assigned to
5. **Student Context Validation**: Users can only access student data they're authorized for

## API ENDPOINT SECURITY

### Authentication Endpoints

| Endpoint | Method | Authentication | Authorization | Security Notes |
|----------|--------|----------------|---------------|----------------|
| `/api/auth/login` | POST | ❌ | ❌ | Rate limited, validates credentials against database |
| `/api/auth/pin-login` | POST | ❌ | ❌ | Rate limited, validates PIN against hashed storage |
| `/api/auth/logout` | POST | ✅ | ✅ | Invalidates session, requires authentication |
| `/api/auth/session` | GET | ✅ | ✅ | Returns current session information |

### Gate Scan Endpoints

| Endpoint | Method | Authentication | Authorization | Security Notes |
|----------|--------|----------------|---------------|----------------|
| `/api/gate/scan` | POST | ✅ | ✅ (OPERATOR+) | Validates operator gate assignment, derives operatorId from session |
| `/api/gate/scan` | GET | ✅ | ✅ (OPERATOR+) | Returns statistics for authorized gates only |

### Student Endpoints

| Endpoint | Method | Authentication | Authorization | Security Notes |
|----------|--------|----------------|---------------|----------------|
| `/api/students` | GET | ✅ | ✅ (ADMIN+) | Returns filtered student list based on role |
| `/api/students/[roll]` | GET | ✅ | ✅ | Validates student access authorization, field-level filtering |
| `/api/students/[roll]/history` | GET | ✅ | ✅ | Validates student access authorization |

### Gate Pass Endpoints

| Endpoint | Method | Authentication | Authorization | Security Notes |
|----------|--------|----------------|---------------|----------------|
| `/api/passes` | GET | ✅ | ✅ | Returns only authorized passes (own/children) |
| `/api/passes` | POST | ✅ | ✅ (STUDENT) | Students can only create passes for themselves |
| `/api/passes/[passId]` | GET | ✅ | ✅ | Validates pass access authorization |
| `/api/passes/[passId]` | PUT | ✅ | ✅ (ADMIN+) | Approval/rejection with proper authorization |
| `/api/passes/[passId]/approve` | POST | ✅ | ✅ (PARENT/WARDEN+) | Validates approval authority |


| Endpoint | Method | Authentication | Authorization | Security Notes |
|----------|--------|----------------|---------------|----------------|

### Admin Endpoints

| Endpoint | Method | Authentication | Authorization | Security Notes |
|----------|--------|----------------|---------------|----------------|
| `/api/admin/dashboard` | GET | ✅ | ✅ (ADMIN+) | Returns system-wide dashboard data |
| `/api/admin/users` | GET | ✅ | ✅ (ADMIN+) | Returns user list with role-based filtering |
| `/api/admin/users` | POST | ✅ | ✅ (ADMIN+) | Creates new user with proper role validation |
| `/api/admin/users/[id]` | GET | ✅ | ✅ (ADMIN+) | Returns user details with field-level filtering |
| `/api/admin/users/[id]` | PUT | ✅ | ✅ (ADMIN+) | Updates user with proper role validation |
| `/api/admin/users/[id]/suspend` | POST | ✅ | ✅ (ADMIN+) | Suspends user account |
| `/api/admin/users/[id]/role` | PUT | ✅ | ✅ (SYSTEM_ADMIN) | Changes user role with proper validation |
| `/api/admin/audit-logs` | GET | ✅ | ✅ (ADMIN+) | Returns audit logs with proper filtering |

### System Endpoints

| Endpoint | Method | Authentication | Authorization | Security Notes |
|----------|--------|----------------|---------------|----------------|
| `/api/alerts` | GET | ✅ | ✅ | Returns alerts based on user role and context |
| `/api/alerts` | POST | ✅ | ✅ | Creates alerts with proper authorization |
| `/api/notifications` | GET | ✅ | ✅ | Returns notifications for authenticated user |

## INPUT VALIDATION

### Validation Rules

1. **Roll Numbers**: Must match expected format (e.g., `24JJ1A0308`)
2. **Student IDs**: Must be valid UUID format
3. **Gate IDs**: Must be valid gate identifiers from database
4. **Direction**: Must be either "IN" or "OUT"
5. **Exit Reason**: Must be valid reason from predefined list
6. **Timestamps**: Must be valid ISO 8601 format, server-validated
7. **PINs**: Must be 8-digit numeric strings
8. **Passwords**: Must meet complexity requirements
9. **Email**: Must be valid email format
10. **Phone Numbers**: Must be valid phone number format

### Validation Middleware
- **Location**: To be implemented in middleware layer
- **Responsibilities**:
  - Validate input format and type
  - Reject malformed or malicious input
  - Sanitize input where appropriate
  - Apply business rule validation

## SECURITY CONTROLS

### Rate Limiting
- **Implementation**: `rate-limiter-flexible` library
- **Configuration**: Endpoint-specific rate limits
- **Key Endpoints**:
  - `/api/auth/login`: 5 requests/hour
  - `/api/auth/pin-login`: 5 requests/hour
  - `/api/gate/scan`: 30 requests/minute
  - `/api/students/[roll]`: 20 requests/minute

### SQL Injection Protection
- **Parameterized Queries**: All database queries must use parameterized queries
- **ORM Usage**: Use Supabase query builder for all database access
- **Input Sanitization**: All user input must be properly sanitized

### Cross-Site Request Forgery (CSRF) Protection
- **SameSite Cookies**: Configure cookies with SameSite attributes
- **CSRF Tokens**: Implement CSRF tokens for state-changing operations
- **CORS**: Configure strict CORS policies

### Security Headers
- **Content-Security-Policy**: Restrict sources for scripts, styles, and other resources
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY` or `SAMEORIGIN`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Strict-Transport-Security**: Enforce HTTPS

### Audit Logging
- **Sensitive Operations**: All authentication, authorization, and data modification operations
- **Log Format**: Structured JSON format with timestamp, user, action, resource, and outcome
- **Immutable Storage**: Audit logs stored in append-only format
- **Log Retention**: Minimum 1 year retention for security-relevant logs

## OPERATOR ID SECURITY

### Current Vulnerability
- **Problem**: Operator ID is accepted from request body (`request.body.operatorId`)
- **Risk**: Operators can forge scan records with any operator ID
- **Impact**: Compromises audit trail integrity

### Secure Implementation
1. **Remove `operatorId` from request body**
2. **Derive operator ID from authenticated session**
3. **Validate operator gate assignment**
4. **Record operator ID in audit logs**
5. **Reject requests with client-supplied operator ID**

### Secure Request Format
```json
// Before (VULNERABLE)
{
  "roll": "24JJ1A0308",
  "direction": "IN",
  "operatorId": "OP123"  // ❌ Client-supplied - VULNERABLE
}

// After (SECURE)
{
  "roll": "24JJ1A0308",  // ✅ Validated against database
  "direction": "IN"      // ✅ Validated against allowed values
}
// Operator ID derived from authenticated session ✅
```

## GATE ID SECURITY

### Current Vulnerability
- **Problem**: Gate ID is accepted from request body (`request.body.gateId`)
- **Risk**: Operators can perform operations against any gate
- **Impact**: Resource misuse, data manipulation

### Secure Implementation
1. **Remove `gateId` from request body for operator endpoints**
2. **Derive gate ID from operator's gate assignment**
3. **Validate gate assignment in database**
4. **Reject requests with client-supplied gate ID for operators**

### Secure Request Flow
```
Authenticated Operator → Session Validation → Gate Assignment Lookup → Operation Execution
```

## STUDENT DATA ACCESS SECURITY

### Current Vulnerabilities
1. **IDOR**: Student endpoints accept `roll` parameter without proper authorization
2. **Over-Exposure**: Full student records returned to operators
3. **Sensitive Data**: Sensitive fields exposed to unauthorized roles

### Secure Implementation
1. **Authorization Validation**: Verify user has permission to access specific student
2. **Field-Level Filtering**: Only return fields appropriate for user role
3. **Parent-Child Validation**: Verify parent-child relationship for parent access
4. **Gate Context Validation**: Operators can only access students in their scan context

### Secure Response Format
```json
// Operator Response (LIMITED FIELDS)
{
  "student": {
    "id": "stu-123",
    "roll": "24JJ1A0308",
    "name": "John Doe",
    "department": "CSE",
    "year": 2,
    "photo": "/photos/stu-123.jpg"
  }
}

// Admin Response (FULL FIELDS)
{
  "student": {
    "id": "stu-123",
    "roll": "24JJ1A0308",
    "name": "John Doe",
    "department": "CSE",
    "year": 2,
    "section": "A",
    "batch": "2024",
    "photo": "/photos/stu-123.jpg",
    "email": "john@university.edu",
    "phone": "+919876543210",
    "parentName": "Jane Doe",
    "parentPhone": "+919876543211",
    // No sensitive fields exposed
  }
}
```

## SESSION SECURITY

### Session Management Requirements
1. **Session Creation**: Create session on successful authentication
2. **Session Validation**: Validate session on every request
3. **Account Status Check**: Verify account is still active on every request
4. **Role Validation**: Verify user role is still valid on every request
5. **Session Invalidation**: Invalidate sessions on logout, password change, or account suspension
6. **Session Timeout**: Enforce session expiration (7 days)
7. **Concurrent Sessions**: Allow multiple concurrent sessions with proper tracking

### Session Security Controls
- **Secure Cookies**: Use HttpOnly, Secure, SameSite cookies
- **Session Tokens**: Use JWT with proper signing and validation
- **Session Tracking**: Track active sessions in database
- **Session Revocation**: Ability to revoke sessions for security incidents
- **Session Monitoring**: Monitor for suspicious session activity

## DATA INTEGRITY

### Immutable Records
- **Gate Scans**: Historical gate scans must be immutable
- **Audit Logs**: Audit logs must be append-only
- **Corrections**: Corrections must create new records, not modify existing ones

### Correction Workflow
```
```

### Timestamp Security
- **Server-Generated**: All authoritative timestamps must be server-generated
- **Validation**: Client-supplied timestamps must be validated against server time
- **Time Windows**: Validate timestamps against reasonable time windows

## SECURITY TESTING REQUIREMENTS

### Authentication Testing
- Test unauthenticated access to protected endpoints
- Test expired/invalid token handling
- Test account status validation (suspended, disabled)
- Test role validation from database

### Authorization Testing
- Test role-based access control for each endpoint
- Test resource-level authorization (student, gate, pass access)
- Test field-level security (data minimization)
- Test gate context validation
- Test operator ID derivation from session

### Input Validation Testing
- Test SQL injection attempts
- Test malformed input handling
- Test business rule validation
- Test parameter format validation

### Session Testing
- Test session validation on every request
- Test session invalidation on logout
- Test session invalidation on account suspension
- Test concurrent session handling

### IDOR Testing
- Test student ID manipulation
- Test gate ID manipulation
- Test pass ID manipulation
- Test user ID manipulation
- Test roll parameter manipulation