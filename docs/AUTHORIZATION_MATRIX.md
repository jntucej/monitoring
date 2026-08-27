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

### Student Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|

### Gate Pass Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/passes` | POST | Required | STUDENT, PARENT | `passes:create` | Gate pass creation | Pass details | `userId`, `studentId` | `Students can create own passes` | None | 5 requests/1 minute | None |
| `/api/passes/{id}/approve` | PUT | Required | ADMIN, SYSTEM_ADMIN, PARENT (limited) | `passes:approve` | Pass approval | `id` | `userId` | None | PASS_APPROVAL | 10 requests/1 minute | None |
| `/api/passes/{id}/reject` | PUT | Required | ADMIN, SYSTEM_ADMIN, PARENT (limited) | `passes:reject` | Pass rejection | `id` | `userId` | None | PASS_REJECTION | 10 requests/1 minute | None |

### Admin Endpoints

| Endpoint | HTTP Method | Authentication | Allowed Roles | Permission | Resource Scope | Client-controlled IDs | Server-derived IDs | RLS Dependency | Audit Required | Rate Limit | PII Returned |
|----------|-------------|----------------|---------------|------------|----------------|-----------------------|--------------------|----------------|---------------|------------|--------------|
| `/api/admin/reports` | GET | Required | ADMIN, SYSTEM_ADMIN | `admin:reports:read` | Report generation | Report parameters | `userId` | None | None | 10 requests/1 minute | Aggregated data |

## Role Hierarchy and Permissions

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| SYSTEM_ADMIN | System administrator with full access | All permissions |
| ADMIN | Administrative staff | Administrative permissions, user management |
| OPERATOR | Gate operators | Gate scanning, student verification |
| STUDENT | Students | Access to own records, pass requests |
| PARENT | Parents | Access to child records, pass approvals |

### Permission Matrix

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