# Authentication Architecture Verification

This document provides an audit of the current authentication architecture against the approved Supabase Auth architecture (OPTION A).

## Summary of Findings

| Category                          | Status             | Notes                                                                 |
|-----------------------------------|--------------------|-----------------------------------------------------------------------|
| Authentication authority          | FAIL               | Custom authentication system exists alongside Supabase Auth           |
| Identity mapping                  | WARNING            | No direct foreign key to auth.users, uses custom mapping             |
| Password architecture             | FAIL               | Passwords stored in public.users table                                |
| JWT architecture                  | FAIL               | Custom JWT implementation exists                                      |
| Session architecture              | FAIL               | Custom session management in database                                 |
| User creation                     | FAIL               | Users created directly in public.users without Supabase Auth         |
| Role management                   | WARNING            | Roles are server-controlled but not tied to Supabase Auth            |
| Account status                    | WARNING            | Account status handled correctly but not tied to Supabase Auth       |
| RLS                               | WARNING            | RLS policies use auth.uid() but system bypasses Supabase Auth        |
| SECURITY DEFINER functions        | WARNING            | Multiple SECURITY DEFINER functions exist                             |
| user_student_mapping              | PASS               | Properly secured with RLS policies                                    |
| Admin creation                    | FAIL               | Admin creation uses password_hash in public.users                    |
| Migration safety                  | FAIL               | Migrations create users with passwords in public schema              |

## Detailed Findings

### 1. SUPABASE AUTH IDENTITY

**FAIL: DEPLOYMENT BLOCKER**

- **Current Implementation**: The system uses a completely custom authentication system with users stored in `public.users` table
- **Expected**: Supabase Auth should be the only authentication authority with `auth.users.id` mapping to `public.users.id` or `public.users.auth_user_id`
- **Evidence**:
  - No `auth.users` table is referenced in any migration files
  - Users are created directly in `public.users` with password hashes (line 670 in db.ts)
  - Login flow uses custom `verifyLogin` function (line 727 in db.ts)
  - No foreign key relationship between `public.users` and `auth.users`

### 2. PASSWORD STORAGE

**FAIL: ARCHITECTURE CONFLICT**

- **Current Implementation**: Passwords are stored in `public.users.password_hash` column
- **Expected**: No password storage in application database - Supabase Auth should handle all password storage
- **Evidence**:
  - `public.users` table has `password_hash` column (0001_initial_schema.sql)
  - `verifyLogin` function compares passwords using bcrypt (line 748 in db.ts)
  - `createUser` function generates and stores password hashes (line 659 in db.ts)
  - Search for password-related terms found multiple instances of password storage

### 3. LOGIN FLOW

**FAIL: ARCHITECTURE CONFLICT**

- **Current Implementation**:
  1. User submits login identifier + password to `/api/auth/login`
  2. `verifyLogin` function checks credentials against `public.users.password_hash`
  3. Custom JWT is created with `signToken` function
  4. Session is created in `public.sessions` table
  5. User data is returned with custom JWT

- **Expected**:
  1. User submits login identifier + credential to Supabase Auth
  2. Supabase Auth authenticates and returns authenticated identity
  3. Application retrieves `public.users` using Supabase user ID
  4. Application checks role and account status
  5. Supabase session is used for authorization

- **Evidence**:
  - Custom login route (login/route.ts)
  - Custom `verifyLogin` function (db.ts line 727)
  - Custom JWT creation (auth.ts line 14)
  - Custom session management (db.ts line 503)

### 4. SESSION MODEL

**FAIL: ARCHITECTURE CONFLICT**

- **Current Implementation**: Custom session management in `public.sessions` table
- **Expected**: Supabase Auth sessions should be the only session mechanism
- **Evidence**:
  - Custom `sessions` table in public schema (0001_initial_schema.sql)
  - Custom session creation function (db.ts line 503)
  - Custom session validation in auth middleware (auth.ts line 40)
  - Custom JWT tokens used for authentication (auth.ts)

### 5. JWT MODEL

**FAIL: ARCHITECTURE CONFLICT**

- **Current Implementation**: Custom JWT implementation using `jose` library
- **Expected**: No custom JWTs - Supabase Auth should provide all authentication tokens
- **Evidence**:
  - Custom `signToken` and `verifyToken` functions (auth.ts)
  - JWT_SECRET environment variable required (auth.ts line 8)
  - Custom JWT payload with user data (auth.ts line 15)
  - JWT verification in auth middleware (auth.ts line 30)

### 6. USER CREATION

**FAIL: ARCHITECTURE CONFLICT**

- **Current Implementation**: Users are created directly in `public.users` table
- **Expected**: Users should be created in Supabase Auth first, then in `public.users`
- **Evidence**:
  - `createUser` function inserts directly into `public.users` (db.ts line 648)
  - Users created with password hashes (db.ts line 659)
  - No reference to Supabase Auth user creation

### 7. ADMIN CREATION

**FAIL: INVALID FOR OPTION A**

- **Current Implementation**: Admin users created with password hashes in `public.users`
- **Expected**: Admin users should be created through Supabase Auth
- **Evidence**:
  - SQL in migrations shows `INSERT INTO users (... password_hash ...)` pattern
  - `createUser` function generates password hashes (db.ts line 659)
  - No Supabase Auth integration for admin creation

### 8. ROLE SECURITY

**WARNING**

- **Current Implementation**: Roles are server-controlled but not tied to Supabase Auth
- **Expected**: Roles should be server-controlled and derived from Supabase Auth identity
- **Evidence**:
  - Roles are stored in `public.users.role` column
  - Role validation in authorization middleware (authorization.ts line 62)
  - RLS policies check roles (0002_functions_triggers_rls.sql line 232)
  - No client-side role selection allowed
  - **Issue**: Roles are not tied to Supabase Auth identity

### 9. ACCOUNT STATUS

**WARNING**

- **Current Implementation**: Account status is properly checked after authentication
- **Expected**: Account status should be checked after Supabase authentication
- **Evidence**:
  - Status validation in authorization middleware (authorization.ts line 54)
  - Status values include ACTIVE, LOCKED, SUSPENDED, DISABLED, DEPROVISIONED
  - Sessions are invalidated when status changes (db.ts line 814)
  - **Issue**: Status checks are not tied to Supabase Auth sessions

### 10. RLS

**WARNING**

- **Current Implementation**: RLS policies use `auth.uid()` but system bypasses Supabase Auth
- **Expected**: RLS policies should use Supabase Auth identity
- **Evidence**:
  - RLS policies reference `auth.uid()` (0002_functions_triggers_rls.sql line 219)
  - Custom authentication system bypasses Supabase Auth
  - Policies check user roles from `public.users` (0002_functions_triggers_rls.sql line 232)
  - **Issue**: RLS policies designed for Supabase Auth but system uses custom auth

### 11. SECURITY DEFINER FUNCTIONS

**WARNING**

- **Current Implementation**: Multiple SECURITY DEFINER functions exist
- **Expected**: SECURITY DEFINER functions should be minimized and carefully reviewed
- **Evidence**:
  - Multiple SECURITY DEFINER functions found (0003_complete_schema_fixes.sql)
  - Functions like `user_student_mapping`, `get_parent_students`, `is_admin` are SECURITY DEFINER
  - Functions access data across security boundaries
  - **Issue**: Potential for privilege escalation if not carefully controlled

### 12. user_student_mapping

**PASS**

- **Current Implementation**: Properly secured with RLS policies
- **Expected**: Secure mapping between users and students
- **Evidence**:
  - Table created with proper foreign key constraints (0003_complete_schema_fixes.sql line 5)
  - RLS policies restrict access to user's own mappings (line 244)
  - Admins can view all mappings (line 250)
  - Triggers maintain data integrity (line 173)

### 13. FINAL VERDICT

**DEPLOYMENT BLOCKER: System cannot be deployed with current architecture**

The current implementation has fundamental architectural conflicts with the approved Supabase Auth architecture:

1. **Critical Issues**:
   - Custom authentication system completely bypasses Supabase Auth
   - Passwords stored in application database
   - Custom JWT implementation
   - Custom session management
   - Direct user creation in public schema

2. **Required Changes**:
   - Migrate to Supabase Auth as the sole authentication authority
   - Remove password storage from public.users
   - Replace custom JWT with Supabase Auth tokens
   - Replace custom sessions with Supabase sessions
   - Establish proper foreign key relationship between auth.users and public.users
   - Update all RLS policies to work with Supabase Auth
   - Review and secure SECURITY DEFINER functions

3. **Migration Path**:
   - Create auth.users entries for all existing users
   - Migrate password hashes to Supabase Auth (if possible)
   - Update login flow to use Supabase Auth
   - Replace custom JWT with Supabase session tokens
   - Update RLS policies to use Supabase Auth identity
   - Test all security boundaries

**Recommendation**: Do not proceed with deployment until the authentication architecture is refactored to comply with OPTION A (Supabase Auth as the sole authentication authority).