# Authorization Matrix

This document defines the authorization requirements for all API endpoints in the Gate Monitoring System.

## Matrix Columns

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
|          |             | Required/Optional | Roles that can access | Specific permission | What resources can be accessed | IDs provided by client | IDs derived from server | RLS policy that applies | Audit log required | Rate limit configuration | Personally Identifiable Information returned |

## API Endpoints

### Authentication Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/auth/login` | POST | Optional | All | `auth:login` | Login functionality | `loginId`, `password` | `userId`, `role`, `status` | None | LOGIN, LOGIN_FAILURE | 5 requests/5 minutes | None |
| `/api/auth/logout` | POST | Required | All | `auth:logout` | Logout functionality | None | `userId` | None | LOGOUT | 10 requests/1 minute | None |
| `/api/auth/session` | GET | Required | All | `auth:session` | Session validation | None | `userId`, `role`, `status` | None | None | 30 requests/1 minute | User profile (limited) |

### User Management Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/users` | GET | Required | ADMIN, SYSTEM_ADMIN | `users:read` | User management | `role`, `status` filters | `userId` | `Admins can view all users` | None | 20 requests/1 minute | User profiles |
| `/api/users` | POST | Required | ADMIN, SYSTEM_ADMIN | `users:create` | User creation | User details | `userId` | None | USER_CREATION | 5 requests/1 minute | None |
| `/api/users/{id}` | GET | Required | ADMIN, SYSTEM_ADMIN, SELF | `users:read` | User profile | `id` | `userId` | `Users can view their own data` | None | 30 requests/1 minute | User profile |
| `/api/users/{id}` | PUT | Required | ADMIN, SYSTEM_ADMIN, SELF (limited) | `users:update` | User profile update | `id`, update data | `userId` | `Users can update their own data` | ACCOUNT_STATUS_CHANGE, ROLE_CHANGE | 10 requests/1 minute | None |
| `/api/users/{id}/status` | PUT | Required | ADMIN, SYSTEM_ADMIN | `users:status:update` | Account status update | `id`, `status` | `userId` | `Admins can update user data` | ACCOUNT_STATUS_CHANGE | 5 requests/1 minute | None |
| `/api/users/{id}/role` | PUT | Required | SYSTEM_ADMIN | `users:role:update` | Role update | `id`, `role` | `userId` | `Sysadmins can update user roles` | ROLE_CHANGE | 5 requests/1 minute | None |

### Gate Operations Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/gate/scan` | POST | Required | OPERATOR, SUPERVISOR | `gate:scan:create` | Gate scan creation | `studentId`, `gateId`, `direction` | `operatorId`, `userId` | `Operators can view logs for their gates` | GATE_SCAN | 60 requests/1 minute | Student info (limited) |
| `/api/gate/logs` | GET | Required | OPERATOR, SUPERVISOR, ADMIN, SYSTEM_ADMIN | `gate:logs:read` | Gate logs access | `gateId`, `studentId`, `dateRange` | `userId` | `Operators can view logs for their gates` | None | 30 requests/1 minute | Scan records |
| `/api/gate/logs/{id}` | GET | Required | OPERATOR, SUPERVISOR, ADMIN, SYSTEM_ADMIN | `gate:logs:read` | Individual log access | `id` | `userId` | `Operators can view logs for their gates` | None | 30 requests/1 minute | Scan record |
| `/api/gate/logs/{id}/correction` | PUT | Required | SUPERVISOR, ADMIN, SYSTEM_ADMIN | `gate:logs:correct` | Scan correction | `id`, correction data | `userId` | None | SCAN_CORRECTION | 10 requests/1 minute | None |

### Student Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/students` | GET | Required | ADMIN, SYSTEM_ADMIN, SUPERVISOR, WARDEN | `students:read` | Student management | `roll`, `department`, `hostel` filters | `userId` | `Admins can view all student data` | None | 20 requests/1 minute | Student profiles |
| `/api/students/{roll}` | GET | Required | ADMIN, SYSTEM_ADMIN, SUPERVISOR, OPERATOR, STUDENT (self), PARENT (children) | `students:read` | Individual student access | `roll` | `userId`, `studentId` | `Students can view their own data` | None | 30 requests/1 minute | Student profile (limited) |
| `/api/students/{roll}/gate-info` | GET | Required | OPERATOR, SUPERVISOR | `students:gate:read` | Gate verification info | `roll` | `userId`, `studentId` | `Students can view their own data` | None | 60 requests/1 minute | Minimal student info |

### Gate Pass Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/passes` | GET | Required | ADMIN, SYSTEM_ADMIN, SUPERVISOR, STUDENT, PARENT | `passes:read` | Gate pass access | `studentId`, `status` filters | `userId` | `Students can view their own gate passes` | None | 20 requests/1 minute | Pass records |
| `/api/passes` | POST | Required | STUDENT, PARENT | `passes:create` | Gate pass creation | Pass details | `userId`, `studentId` | `Students can create own passes` | None | 5 requests/1 minute | None |
| `/api/passes/{id}` | GET | Required | ADMIN, SYSTEM_ADMIN, SUPERVISOR, STUDENT, PARENT | `passes:read` | Individual pass access | `id` | `userId` | `Students can view their own gate passes` | None | 30 requests/1 minute | Pass record |
| `/api/passes/{id}/approve` | PUT | Required | ADMIN, SYSTEM_ADMIN, PARENT (limited) | `passes:approve` | Pass approval | `id` | `userId` | None | PASS_APPROVAL | 10 requests/1 minute | None |
| `/api/passes/{id}/reject` | PUT | Required | ADMIN, SYSTEM_ADMIN, PARENT (limited) | `passes:reject` | Pass rejection | `id` | `userId` | None | PASS_REJECTION | 10 requests/1 minute | None |

### Admin Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/admin/dashboard` | GET | Required | ADMIN, SYSTEM_ADMIN, SUPERVISOR | `admin:dashboard:read` | Dashboard data | None | `userId` | None | None | 30 requests/1 minute | Aggregated data |
| `/api/admin/reports` | GET | Required | ADMIN, SYSTEM_ADMIN | `admin:reports:read` | Report generation | Report parameters | `userId` | None | None | 10 requests/1 minute | Aggregated data |
| `/api/admin/alerts` | GET | Required | ADMIN, SYSTEM_ADMIN, SUPERVISOR | `admin:alerts:read` | Alert management | Alert filters | `userId` | `Supervisors can view alerts for their gates` | None | 20 requests/1 minute | Alert records |
| `/api/admin/alerts/{id}` | PUT | Required | ADMIN, SYSTEM_ADMIN, SUPERVISOR | `admin:alerts:update` | Alert resolution | `id` | `userId` | None | None | 10 requests/1 minute | None |

## Role Hierarchy and Permissions

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| SYSTEM_ADMIN | System administrator with full access | All permissions |
| ADMIN | Administrative staff | Administrative permissions, user management |
| SUPERVISOR | Gate supervisors | Operational oversight, scan corrections |
| OPERATOR | Gate operators | Gate scanning, student verification |
| STUDENT | Students | Access to own records, pass requests |
| PARENT | Parents | Access to child records, pass approvals |

### Permission Matrix

| Permission | SYSTEM_ADMIN | ADMIN | SUPERVISOR | OPERATOR | STUDENT | PARENT |
|------------|--------------|-------|------------|----------|---------|--------|
| `auth:login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `auth:logout` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `users:read` | ✅ | ✅ | ❌ | ❌ | SELF | ❌ |
| `users:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `users:update` | ✅ | ✅ | ❌ | ❌ | LIMITED | ❌ |
| `users:status:update` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `users:role:update` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `gate:scan:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `gate:logs:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `gate:logs:correct` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `students:read` | ✅ | ✅ | ✅ | OPERATIONAL | SELF | CHILDREN |
| `students:gate:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `passes:read` | ✅ | ✅ | ✅ | ❌ | SELF | CHILDREN |
| `passes:create` | ✅ | ✅ | ❌ | ❌ | SELF | CHILDREN |
| `passes:approve` | ✅ | ✅ | ❌ | ❌ | ❌ | LIMITED |
| `passes:reject` | ✅ | ✅ | ❌ | ❌ | ❌ | LIMITED |
| `admin:dashboard:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `admin:reports:read` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `admin:alerts:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `admin:alerts:update` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

## Security Requirements

### Client-Controlled IDs Validation

All client-provided IDs must be validated against the authenticated user's permissions:

1. **User IDs**: Must match authenticated user or be accessible based on role
2. **Student IDs**: Must be accessible based on role and relationship
3. **Gate IDs**: Must be accessible based on role and assignment
4. **Pass IDs**: Must be accessible based on role and ownership
5. **Log IDs**: Must be accessible based on role and gate assignment

### Server-Derived IDs

All server-derived IDs must come from:
1. Authenticated Supabase session
2. Database lookup with proper RLS
3. Authorized relationships

### PII Minimization

- **Operators**: Only receive minimal student information for gate verification
- **Students**: Only receive their own information
- **Parents**: Only receive their children's information
- **Administrators**: Receive appropriate information based on role

### Audit Requirements

All sensitive operations must create audit logs with:
- Action performed
- Authenticated user ID
- Timestamp
- Relevant resource IDs
- Status (success/failure)
- IP address (if available)