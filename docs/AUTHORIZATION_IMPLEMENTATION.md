# Authorization System Implementation

## Overview

This document describes the implementation of the centralized authorization system for the Gate Monitoring System. The system provides comprehensive security controls to prevent unauthorized access, identity forgery, and data breaches.

## Architecture Components

### 1. Authentication Context (`authContext.ts`)

**Purpose**: Centralized server-side authentication context that derives identity from trusted Supabase sessions.

**Key Features**:
- Validates Supabase session tokens
- Retrieves and validates user profile from database
- Ensures consistency between auth user and database user
- Provides role-based authorization functions
- Implements resource access validation

**Security Controls**:
- Prevents client-side identity spoofing
- Validates account status (ACTIVE/INACTIVE)
- Enforces role-based access control
- Provides resource-specific access validation

### 2. Authorization Middleware (`authorization.ts`)

**Purpose**: Consistent authorization checks across all API routes.

**Key Features**:
- Token extraction from Authorization header
- Authentication context creation
- Role and permission validation
- Resource access validation
- Error handling with appropriate HTTP status codes
- Audit logging integration

**Usage**:
```typescript
// Basic role-based authorization
export const GET = withAuthorization(handleGet, {
});

// Resource-specific authorization
export const POST = withAuthorization(handlePost, {
  requiredRole: ['operator'],
  resourceType: 'gate',
  resourceIdParam: 'gateId',
  operation: 'create'
});
```

### 3. Secure API Endpoints

**Gate Scan Endpoint Security**:
- Operator identity derived from authenticated session (not client-provided)
- Gate authorization validation (operators can only access assigned gates)
- Student access validation
- PII minimization (only necessary student info returned)
- Comprehensive audit logging
- Rate limiting

## Security Features Implemented

### 1. Operator ID Forgery Protection

**Problem**: Previous implementation allowed client to specify operator ID, enabling identity spoofing.

**Solution**:
- Operator ID is now derived from the authenticated session
- Client-provided operator ID is ignored
- Audit logs record the actual authenticated operator

**Code Change**:
```typescript
// Before (vulnerable)
operatorId: body.operatorId || operator.id,

// After (secure)
operatorId: auth.userId,
```

### 2. Gate Access Control

**Problem**: Operators could access any gate, not just their assigned gate.

**Solution**:
- Operators can only access gates they're assigned to
- Admins can access all gates
- Gate status validation (only ACTIVE gates allowed)

**Implementation**:
```typescript
if (auth.role === 'operator') {
  if (!auth.gateId || auth.gateId !== gateId) {
    throw new Error('FORBIDDEN: Not assigned to this gate');
  }
}
```

### 3. Account Status Validation

**Problem**: Inactive/disabled accounts could still access the system.

**Solution**:
- Every request validates account status
- Inactive accounts are rejected with 403 status
- Configurable to allow inactive accounts for specific endpoints

**Implementation**:
```typescript
if (!options.allowInactive && !authContext.isActive) {
  return NextResponse.json(
    { success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } },
    { status: 403 }
  );
}
```

### 4. PII Minimization

**Problem**: Gate operators could access sensitive student PII.

**Solution**:
- Gate verification endpoints return only necessary information
- Sensitive fields (email, phone, parent info) are excluded
- Student photo is the only identifying image returned

**Example Response**:
```json
{
  "id": "student-id",
  "roll": "CS20B1001",
  "name": "John Doe",
  "department": "Computer Science",
  "year": 2,
  "section": "A",
  "photo": "/photos/student.jpg",
  "hostelBlock": "A",
  "roomNumber": "101"
}
```

### 5. Comprehensive Audit Logging

**Problem**: Lack of visibility into security-critical operations.

**Solution**:
- All gate scans are logged
- Failed access attempts are logged
- Audit logs include:
  - Event type
  - User ID and role
  - IP address
  - Timestamp
  - Event details (student, gate, direction, etc.)

**Example Audit Log**:
```json
{
  "event_type": "GATE_SCAN",
  "user_id": "operator-id",
  "details": {
    "studentId": "student-id",
    "roll": "CS20B1001",
    "direction": "IN",
    "gateId": "gate-1",
    "operatorId": "operator-id",
    "isManual": false
  },
  "ip_address": "192.168.1.100",
  "timestamp": "2026-08-16T15:30:00.000Z"
}
```

## Resource Access Validation

The system implements fine-grained access control for different resource types:

| Resource Type | Access Rules |
|--------------|-------------|
| **User** | Users can access their own info; admins can access all users |
| **Student** | Students can access their own info; parents can access their children; operators can access for gate verification; admins can access all |
| **Gate Pass** | Students can access their own passes; parents can access their children's passes; admins can access all |

## Error Handling

The authorization system provides consistent error responses:

| Error Code | HTTP Status | Description |
|-----------|------------|-------------|
| UNAUTHORIZED | 401 | Authentication required or failed |
| FORBIDDEN | 403 | Insufficient permissions |
| ACCOUNT_INACTIVE | 403 | Account is not active |
| NOT_FOUND | 404 | Resource not found |
| INTERNAL_ERROR | 500 | Internal server error |

## Testing

The system includes comprehensive security tests that verify:

1. **Anonymous Access**: Unauthenticated users are denied access
2. **Role Separation**: Users cannot access endpoints outside their role
3. **Operator ID Forgery**: Client-provided operator IDs are ignored
4. **Gate Access Control**: Operators can only access assigned gates
5. **Account Status**: Inactive accounts are denied access
6. **IDOR Protection**: Users cannot access resources they don't own
7. **PII Minimization**: Sensitive information is not exposed
8. **Audit Logging**: Security events are properly logged

## Integration Points

### Supabase Authentication

- Session tokens are validated with Supabase
- User profiles are retrieved from the database
- Identity consistency is enforced (auth user ID = database user ID)

### Database Schema

- Users table contains role and status information
- Gates table contains gate assignments
- Audit logs table records security events

### API Endpoints

- All protected endpoints use the authorization middleware
- Gate scan endpoint implements additional security controls
- Resource-specific validation is applied where needed

## Deployment Considerations

1. **Environment Variables**: Ensure Supabase credentials are properly configured
2. **Database Setup**: Audit logs table must exist
3. **Rate Limiting**: Configure appropriate rate limits for security endpoints
4. **Monitoring**: Set up monitoring for failed authorization attempts

## Future Enhancements

1. **Permission System**: Implement a granular permission system beyond roles
2. **Temporary Access**: Support for temporary elevated access
3. **Session Management**: Enhanced session validation and revocation
4. **Multi-Factor Authentication**: Support for MFA in high-security areas

## Conclusion

The implemented authorization system provides robust security controls that address the critical vulnerabilities identified in the gate monitoring system. By centralizing authentication and authorization logic, enforcing role-based access control, and implementing comprehensive audit logging, the system significantly reduces the risk of unauthorized access and data breaches.