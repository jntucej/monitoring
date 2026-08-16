# Supabase Auth Migration Design

## 1. Executive Summary

This document outlines the migration design from the current custom authentication system to Supabase Auth as the sole authentication authority. The migration will transition the Gate Monitoring System to a secure, standards-based authentication architecture while maintaining all existing functionality.

**Key Objectives:**
- Replace custom authentication with Supabase Auth
- Maintain existing role and account status models
- Preserve login identifier requirements (non-email identifiers)
- Enable secure initial credential provisioning
- Integrate with existing RLS policies
- Ensure backward compatibility during migration

## 2. Current Architecture

### Current Authentication Flow
1. User submits login identifier + password to `/api/auth/login`
2. `verifyLogin()` checks credentials against `public.users.password_hash`
3. Custom JWT created with `signToken()`
4. Session created in `public.sessions`
5. Custom JWT returned to client

### Current Data Model
- `public.users` table with `password_hash` column
- Custom session management in `public.sessions`
- Custom JWT implementation using `jose` library
- Role-based access control in `public.users.role`
- Account status in `public.users.status`

### Current Security Components
- `verifyLogin()` - Custom password verification
- `signToken()`/`verifyToken()` - Custom JWT implementation
- `JWT_SECRET` - Environment variable for JWT signing
- Custom auth middleware - Validates JWT and sessions
- RLS policies using `auth.uid()` (but no actual Supabase Auth integration)

## 3. Target Architecture

### Authentication Flow
```
User → Supabase Auth → auth.users → public.users → Application Authorization → RLS
```

### Target Data Model
```
Supabase Auth (auth.users)
    ↓ (1:1 relationship)
public.users (application profile)
    ↓
Application Authorization (roles, status)
    ↓
Row Level Security (RLS)
```

### Key Principles
- Supabase Auth is the sole authentication authority
- No password storage in application database
- Supabase sessions replace custom sessions
- Roles and account status managed in application layer
- RLS policies use Supabase Auth identity (`auth.uid()`)

## 4. Identity Model

### Option 1: Direct ID Matching (public.users.id = auth.users.id)
- **Pros**:
  - Simpler architecture
  - No need for foreign key relationship
  - Easier to understand and maintain
  - Better performance (no join required)
- **Cons**:
  - Requires careful coordination during user creation
  - Potential for ID conflicts if not managed properly
  - Less flexible for future changes

### Option 2: Foreign Key Relationship (public.users.auth_user_id → auth.users.id)
- **Pros**:
  - Clear separation between auth and application layers
  - More flexible for future changes
  - Explicit relationship in database schema
  - Easier to handle data migration
- **Cons**:
  - Requires join for most user lookups
  - Slightly more complex architecture
  - Additional storage for foreign key

### **Recommended Approach: Option 1 (Direct ID Matching)**
**Rationale:**
- The application already has a well-established user ID system
- Direct matching simplifies the architecture and improves performance
- Reduces complexity in RLS policies and application code
- Better aligns with Supabase's recommended patterns
- Minimizes changes to existing application logic

**Implementation:**
- `public.users.id` will be set to match `auth.users.id`
- User creation will coordinate between Supabase Auth and application database
- Existing user IDs will be preserved during migration

## 5. Login Model

### Current Login Flow
1. Client submits login identifier + password to `/api/auth/login`
2. Server calls `verifyLogin()` to check credentials
3. Server creates custom JWT with `signToken()`
4. Server creates session in `public.sessions`
5. Server returns JWT to client

### Target Login Flow
1. Client submits login identifier + password to Supabase Auth
2. Supabase Auth authenticates and returns session (access token, refresh token)
3. Client includes access token in API requests
4. Server validates token with Supabase
5. Server retrieves user profile from `public.users` using `auth.uid()`
6. Server validates account status and role
7. Application authorization middleware grants access

### Login Identifier Implementation

**Option 1: Email Aliasing**
- Use Supabase Auth's email-based authentication
- Store approved login identifiers (employee ID, roll number) in `public.users`
- Use email as the primary identifier but display approved identifiers in UI
- Map approved identifiers to email addresses during login

**Option 2: Custom Metadata with Supabase Auth**
- Use Supabase Auth's phone-based authentication
- Store approved login identifiers in `auth.users.raw_user_meta_data`
- Create custom login endpoint that maps identifiers to Supabase Auth users
- Use Supabase Auth for actual authentication

**Recommended Approach: Option 1 (Email Aliasing)**
**Rationale:**
- Leverages Supabase Auth's built-in email authentication
- Maintains security while supporting custom identifiers
- Easier to implement and maintain
- Better compatibility with Supabase features
- Supports password reset and other standard flows

**Implementation:**
- Store approved identifiers (employee_id, roll) in `public.users`
- Use email as the primary authentication identifier
- Create mapping between approved identifiers and email addresses
- Display approved identifiers in UI while using email for authentication

## 6. Credential Model

### Initial Credential Provisioning
1. Administrator creates user in Supabase Auth with temporary password
2. Administrator sets initial credential (8-digit PIN) in `public.users.initial_pin_hash`
3. User receives welcome email with login instructions
4. User logs in with temporary password
5. System prompts user to set permanent password and verify PIN
6. PIN is hashed and stored in `public.users.pin_hash`
7. Initial PIN hash is cleared

### Security Requirements
- Plaintext credentials never stored
- Administrators cannot retrieve existing credentials
- Password reset uses Supabase's secure mechanisms
- Credentials never appear in logs, audit logs, or URLs
- Credentials never committed to Git

### Implementation
- Use `bcrypt` for PIN hashing (same as current password hashing)
- Store PIN hashes in `public.users.pin_hash` column
- Use Supabase Auth's password reset flow for password management
- Implement secure PIN verification endpoint
- Clear initial PIN hash after first use

## 7. User Creation

### Current User Creation
1. `createUser()` generates random password
2. Password is hashed with bcrypt
3. User created in `public.users` with password hash
4. Audit log entry created

### Target User Creation
1. Administrator initiates user creation
2. System generates random temporary password
3. User created in Supabase Auth with temporary password
4. User profile created in `public.users` with matching ID
5. Initial PIN generated and hashed
6. Welcome email sent with temporary password
7. Audit log entry created

### User Creation Flow
```
Admin → Create User Form → Backend → Supabase Auth → public.users → Email → User
```

### Data Model Changes
- Remove `password_hash` from `public.users`
- Add `pin_hash` to `public.users`
- Add `initial_pin_hash` to `public.users` (temporary)
- Add `auth_provider` to track authentication method

## 8. Password Reset

### Current Implementation
- Custom password reset flow (not implemented in current code)

### Target Implementation
1. User requests password reset
2. Supabase Auth sends password reset email
3. User clicks link and sets new password
4. Supabase Auth updates password
5. User can log in with new password

### Security Considerations
- Use Supabase's built-in password reset flow
- No custom password reset logic
- Secure, time-limited tokens
- Rate limiting to prevent brute force attacks

## 9. Session Model

### Current Session Management
- Custom `sessions` table in public schema
- Custom JWT tokens
- Session validation in auth middleware
- Session invalidation on status/role changes

### Target Session Management
- Supabase Auth sessions (access token, refresh token)
- No custom session table
- Token validation using Supabase client libraries
- Session invalidation through Supabase Auth

### Session Flow
1. User authenticates with Supabase Auth
2. Supabase returns access token (JWT) and refresh token
3. Client includes access token in API requests
4. Server validates token with Supabase
5. Server checks account status and role from `public.users`
6. Access granted or denied based on authorization rules

### Session Invalidation
- Account status changes: Invalidate all sessions via Supabase Auth
- Role changes: Invalidate all sessions via Supabase Auth
- Password changes: Invalidate all sessions via Supabase Auth
- Manual revocation: Invalidate specific sessions via Supabase Auth

## 10. Role Model

### Current Role Model
- Roles stored in `public.users.role`
- Role validation in authorization middleware
- RLS policies check user roles
- No client-side role selection

### Target Role Model
- Roles stored in `public.users.role`
- Role validation in application layer
- RLS policies check user roles
- Supabase Auth identity used for authentication
- Application layer handles authorization

### Role Assignment Rules
- Users cannot promote themselves
- Users cannot change their own role
- Operator cannot promote operator
- Supervisor cannot promote supervisor
- Only authorized administrative authority can change roles
- Role changes must invalidate sessions
- Client-provided role never trusted

### Role Assignment Flow
1. Administrator selects user and new role
2. System validates administrator has permission to assign role
3. System updates `public.users.role`
4. System invalidates all user sessions
5. Audit log entry created

### Role Hierarchy
```
SYSTEM_ADMIN > ADMIN > SUPERVISOR > OPERATOR > STUDENT/PARENT
```

## 11. Account Status Model

### Current Status Model
- Status values: ACTIVE, LOCKED, SUSPENDED, DISABLED, DEPROVISIONED
- Status validation in authorization middleware
- Session invalidation on status changes

### Target Status Model
- Status values remain the same
- Status stored in `public.users.status`
- Status validation after Supabase authentication
- Status changes invalidate all sessions

### Status Flow
```
Supabase Auth → auth.users → public.users → status validation → authorization
```

### Status Handling
- **ACTIVE**: Full access
- **LOCKED**: No access, temporary lock
- **SUSPENDED**: No access, temporary suspension
- **DISABLED**: No access, permanent disablement
- **DEPROVISIONED**: No access, account removed

### Status Change Process
1. Administrator changes user status
2. System updates `public.users.status`
3. System invalidates all user sessions
4. Audit log entry created

## 12. API Authentication

### Current API Authentication
- Custom JWT in Authorization header
- Custom auth middleware validates JWT
- Session validation from `public.sessions`

### Target API Authentication
- Supabase access token in Authorization header
- Middleware validates token with Supabase
- User profile retrieved from `public.users`
- Account status and role validated

### Authentication Flow
1. Client includes `Authorization: Bearer <supabase-access-token>`
2. Middleware validates token with Supabase
3. Middleware extracts `auth.uid()` from token
4. Middleware retrieves user from `public.users`
5. Middleware validates account status
6. Middleware validates role permissions
7. Request proceeds or is rejected

### Error Handling
- **401 Unauthorized**: Invalid or missing token
- **403 Forbidden**: Valid token but inactive account or insufficient permissions
- **404 Not Found**: User not found in `public.users`

## 13. RLS Architecture

### Current RLS Policies
- Policies use `auth.uid()` but no actual Supabase Auth integration
- Custom functions like `is_admin()`, `get_parent_students()`
- User-student mapping through `user_student_mapping` table

### Target RLS Architecture
- Policies use actual `auth.uid()` from Supabase Auth
- Existing functions remain but use Supabase identity
- User-student mapping remains unchanged

### Policy Review

| Policy | Current Implementation | Target Implementation | Changes Needed |
|--------|------------------------|-----------------------|----------------|
| Users can view their own data | `id = auth.uid()` | `id = auth.uid()` | None |
| Users can update their own data | `id = auth.uid()` | `id = auth.uid()` | None |
| Admins can view all users | `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')` | `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')` | None |
| Students can view their own data | `id = (SELECT student_id FROM user_student_mapping WHERE user_id = auth.uid())` | `id = (SELECT student_id FROM user_student_mapping WHERE user_id = auth.uid())` | None |
| Parents can view their children's data | `parent_id = auth.uid()` | `parent_id = auth.uid()` | None |
| Operators can view their assigned gates | Complex function | Complex function | None |
| All users can view active gates | `is_active = TRUE` | `is_active = TRUE` | None |

### Functions Review

| Function | Current Implementation | Target Implementation | Changes Needed |
|----------|------------------------|-----------------------|----------------|
| `user_student_mapping()` | Uses custom logic | Uses Supabase `auth.uid()` | Update to use real auth.uid() |
| `is_admin()` | Checks `public.users` | Checks `public.users` | None |
| `get_parent_students()` | Returns student IDs | Returns student IDs | None |
| `is_operator()` | Checks `public.users` | Checks `public.users` | None |
| `is_supervisor()` | Checks `public.users` | Checks `public.users` | None |

## 14. SECURITY DEFINER Review

### Inventory of SECURITY DEFINER Functions

| Function | Purpose | Caller | Tables Accessed | Authorization | Risk | Necessity |
|----------|---------|--------|-----------------|---------------|------|-----------|
| `user_student_mapping()` | Maps users to students for RLS | RLS policies | `students`, `user_student_mapping` | Uses `auth.uid()` | Low | Required for RLS |
| `get_parent_students()` | Gets students for parent | RLS policies | `user_student_mapping` | Uses `auth.uid()` | Low | Required for RLS |
| `is_admin()` | Checks if user is admin | RLS policies | `users` | Uses `auth.uid()` | Low | Required for RLS |
| `is_sysadmin()` | Checks if user is sysadmin | RLS policies | `users` | Uses `auth.uid()` | Low | Required for RLS |
| `is_warden()` | Checks if user is warden | RLS policies | `users` | Uses `auth.uid()` | Low | Required for RLS |
| `is_operator()` | Checks if user is operator | RLS policies | `users` | Uses `auth.uid()` | Low | Required for RLS |
| `is_supervisor()` | Checks if user is supervisor | RLS policies | `users` | Uses `auth.uid()` | Low | Required for RLS |
| `get_supervised_gates()` | Gets gates supervised by user | RLS policies | `users` | Uses `auth.uid()` | Low | Required for RLS |
| `get_warden_hostel()` | Gets hostel assigned to warden | RLS policies | `users` | Uses `auth.uid()` | Low | Required for RLS |
| `maintain_user_student_mapping()` | Maintains user-student mapping | Triggers | `students`, `user_student_mapping` | Trigger-based | Medium | Required for data integrity |
| `update_user_student_mapping_on_parent_change()` | Updates mapping on parent change | Triggers | `students`, `user_student_mapping` | Trigger-based | Medium | Required for data integrity |

### Security Assessment
- All SECURITY DEFINER functions are used for RLS or data integrity
- Functions that access user data use `auth.uid()` for authorization
- No high-risk functions identified
- SECURITY DEFINER is necessary for RLS functions to access data across security boundaries
- Trigger functions are necessary for maintaining data integrity

## 15. Legacy Component Migration Map

| Component | Current Purpose | Target Replacement | Migration Strategy | Removal Condition |
|-----------|-----------------|--------------------|--------------------|-------------------|
| `verifyLogin()` | Verify user credentials | Supabase Auth | Replace with Supabase client authentication | When Supabase Auth is fully integrated |
| `password_hash` | Store password hashes | Supabase Auth | Remove column, use Supabase Auth for password storage | When all users migrated to Supabase Auth |
| `bcrypt` | Password hashing | Supabase Auth | Remove password hashing, keep for PIN hashing | When PIN functionality is migrated |
| `signToken()` | Create custom JWT | Supabase Auth tokens | Replace with Supabase access tokens | When all clients use Supabase tokens |
| `verifyToken()` | Verify custom JWT | Supabase token validation | Replace with Supabase token validation | When all clients use Supabase tokens |
| `JWT_SECRET` | Sign custom JWTs | Supabase Auth | Remove environment variable | When custom JWTs are no longer used |
| `public.sessions` | Custom session management | Supabase sessions | Remove table, use Supabase sessions | When all sessions use Supabase |
| Custom auth middleware | Validate custom JWTs and sessions | Supabase token validation | Replace with Supabase token validation and user profile lookup | When all authentication uses Supabase |

## 16. Migration Phases

### Phase 1: Design & Planning (Current Phase)
- Complete migration design
- Review and approval
- Environment setup

### Phase 2: Schema Preparation
- Add new columns for migration
- Create migration scripts
- Set up Supabase Auth
- Test schema changes

### Phase 3: Authentication Integration
- Implement Supabase Auth client
- Create login/logout endpoints
- Implement token validation middleware
- Test authentication flows

### Phase 4: Data Migration
- Migrate user data to Supabase Auth
- Set up initial credentials
- Test user access
- Validate data integrity

### Phase 5: Application Integration
- Update all API endpoints to use new auth
- Update RLS policies
- Update client applications
- Test all functionality

### Phase 6: Legacy Component Removal
- Remove custom auth components
- Remove legacy columns
- Clean up code
- Final testing

### Phase 7: Deployment
- Deploy to staging
- Final security review
- Deploy to production
- Monitoring and support

## 17. Security Risks

### Migration Risks
- **Data migration errors**: Incorrect user data migration could lock users out
- **Authentication failures**: Integration issues could prevent user access
- **Session management**: Transition between custom and Supabase sessions could cause issues
- **RLS policy errors**: Incorrect RLS policies could expose sensitive data

### Mitigation Strategies
- **Comprehensive testing**: Test all migration scenarios
- **Gradual rollout**: Migrate users in batches
- **Fallback mechanisms**: Maintain ability to roll back
- **Monitoring**: Implement detailed logging and monitoring
- **Security review**: Conduct thorough security review before deployment

## 18. Deployment Blockers

### Technical Blockers
- **User data migration**: Ensuring all users can be migrated to Supabase Auth
- **Initial credential provisioning**: Securely providing initial credentials to users
- **Login identifier mapping**: Mapping existing identifiers to Supabase Auth identifiers
- **Session management**: Ensuring smooth transition between session systems
- **RLS policy validation**: Ensuring RLS policies work correctly with Supabase Auth

### Organizational Blockers
- **User communication**: Informing users about the migration
- **Training**: Training administrators on new processes
- **Support**: Providing support during and after migration
- **Testing**: Comprehensive testing of all scenarios

## 19. Recommended Architecture

### Identity Model
- **Direct ID matching**: `public.users.id = auth.users.id`
- **Email-based authentication**: Use email as primary identifier with custom identifier display
- **PIN verification**: Additional PIN verification for certain operations

### Authentication Flow
1. User submits login identifier + password to Supabase Auth
2. Supabase Auth authenticates and returns session tokens
3. Client includes access token in API requests
4. Server validates token with Supabase
5. Server retrieves user profile from `public.users` using `auth.uid()`
6. Server validates account status and role
7. Application authorization grants or denies access

### Data Model Changes
- Remove `password_hash` from `public.users`
- Add `pin_hash` to `public.users`
- Add `initial_pin_hash` to `public.users` (temporary)
- Add `auth_provider` to track authentication method

### Security Components
- **Authentication**: Supabase Auth
- **Session Management**: Supabase sessions
- **Authorization**: Application layer + RLS
- **PIN Verification**: Application layer with bcrypt hashing
- **Password Management**: Supabase Auth

## 20. Acceptance Criteria

### Functional Criteria
- [ ] Users can authenticate using Supabase Auth
- [ ] All existing roles (SYSTEM_ADMIN, ADMIN, SUPERVISOR, OPERATOR, STUDENT, PARENT) are supported
- [ ] All existing account statuses (ACTIVE, LOCKED, SUSPENDED, DISABLED, DEPROVISIONED) are supported
- [ ] Login identifiers (employee ID, roll number) are supported in UI
- [ ] Initial credentials can be securely provisioned by administrators
- [ ] Password reset functionality works through Supabase Auth
- [ ] Session invalidation works for status and role changes
- [ ] All existing RLS policies work with Supabase Auth
- [ ] All existing functionality is preserved

### Security Criteria
- [ ] No passwords stored in application database
- [ ] Supabase Auth is the sole authentication authority
- [ ] Custom authentication components are removed
- [ ] RLS policies use Supabase Auth identity
- [ ] Session management uses Supabase sessions
- [ ] Initial credentials are securely provisioned
- [ ] No plaintext credentials in logs or audit trails
- [ ] All security functions (SECURITY DEFINER) are properly secured

### Migration Criteria
- [ ] All existing users can be migrated to Supabase Auth
- [ ] Migration process preserves existing user IDs
- [ ] Migration process maintains data integrity
- [ ] Rollback plan is in place
- [ ] Comprehensive testing completed
- [ ] Security review completed
- [ ] Performance testing completed

### Documentation Criteria
- [ ] Migration design document completed
- [ ] Implementation plan documented
- [ ] Testing plan documented
- [ ] Rollback plan documented
- [ ] User communication plan documented
- [ ] Administrator training materials created
- [ ] Support documentation created