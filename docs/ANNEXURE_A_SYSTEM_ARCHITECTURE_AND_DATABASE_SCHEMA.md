# ANNEXURE A: SYSTEM ARCHITECTURE & DATABASE SCHEMA

**System Name:** Educational Institution Gate Monitoring & Access Control System  
**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Classification:** Confidential - Internal Architecture Reference  

---

## 1. Executive Summary & Architecture Overview

The **Gate Monitoring System** is a high-availability, security-hardened access control and student movement tracking platform designed for educational institutions. The system enforces strict backend-authoritative trust boundaries, role-based access control (RBAC), multi-factor gate verification, and real-time student occupancy tracking.

### 1.1 High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                   CLIENT LAYER                                    |
|   +-------------------+    +---------------------+    +-----------------------+   |
|   | (PWA / Mobile UI) |    | (Pass Requests UI)  |    | Dashboard UI          |   |
+---------+--------------------------+--------------------------+-------------------+
          |                          |                          |
          +--------------------------+--------------------------+
                                     |
                                     v
+-----------------------------------------------------------------------------------+
|                        EDGE & MIDDLEWARE SECURITY BOUNDARY                        |
|   +---------------------------------------------------------------------------+   |
|   | Next.js Edge Middleware (`/src/middleware.ts`, `auth.ts`)                |   |
|   |  - JWT Verification & Active Session Validation (`sessions` lookup)       |   |
|   |  - Account Status Enforcement (`ACTIVE` vs `LOCKED`/`SUSPENDED`)          |   |
|   |  - Centralized Authorization & Permission Guard (`authorization.ts`)      |   |
|   +---------------------------------------------------------------------------+   |
+------------------------------------+----------------------------------------------+
                                     |
                                     v
+-----------------------------------------------------------------------------------+
|                                 APPLICATION LAYER                                 |
|   +---------------------+   +---------------------+   +-----------------------+   |
|   | Scan & Verification |   | Pass Management Engine| | User & Role Admin     |   |
|   | (`/api/gate/scan`)  |   | (`/api/passes`)     |   | (`/api/users`)        |   |
|   +----------+----------+   +----------+----------+   +-----------+-----------+   |
+--------------|-------------------------|--------------------------|---------------+
               |                         |                          |
               v                         v                          v
+-----------------------------------------------------------------------------------+
|                             DATABASE LAYER (SUPABASE)                             |
|   +---------------------------------------------------------------------------+   |
|   | PostgreSQL Engine + Row Level Security (RLS) + SECURITY DEFINER Triggers   |   |
|   | Tables: `users`, `students`, `gate_passes`, `gate_logs`, `campus_occupancy` |
|   |         `alerts`, `audit_logs`, `notifications`, `sessions`, `gates`      |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Subsystems & Trust Boundaries

### 2.1 Component Specifications

| Subsystem Component | Tech Stack | Responsibilities | Security Controls |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Next.js 15 (App Router), React, Tailwind CSS | Scanner viewfinder, pass generation, admin dashboards, live feeds. | Zero security authority. Renders server responses. No local business rules. |
| **Edge API Gateway** | Next.js API Routes (`/src/app/api/*`) | Endpoint routing, input validation, request parsing. | Strips client-submitted identity assertions (`operatorId`, `roles`). Derives context from session. |
| **Auth Middleware** | Custom JWT + Supabase Auth | Session validation, active session checks, account status verification. | Immediate rejection of invalid/revoked tokens or non-ACTIVE status accounts. |
| **Database Layer** | PostgreSQL (Supabase) | Data persistence, schema constraints, audit logging, RLS enforcement. | RLS policies prevent unauthorized row access even on direct SQL connection. |

### 2.2 Security Trust Boundaries

```
[ UNTRUSTED CLIENT ] 
         ||  (HTTPS + JWT Bearer Token)
         \/
----------------------------------------------------------------- [ Boundary 1: Transport ]
[ EDGE MIDDLEWARE ] (Token Verification, Account Status Check)
         ||
         \/
----------------------------------------------------------------- [ Boundary 2: Authorization ]
[ API CONTROLLER ] (Permission Check, Server ID Derivation)
         ||
         \/
----------------------------------------------------------------- [ Boundary 3: Business Engine ]
[ DATABASE / RLS ] (Row-Level Security Policies, Audit Triggers)
```

---

## 3. Comprehensive Database Schema Specification

### 3.1 Entity-Relationship Diagram (ERD ASCII Representation)

```
 +--------------------+       1:N       +---------------------+
 |       GATES        |<----------------|        USERS        |
 |--------------------|                 |---------------------|
 | id (PK)            |                 | id (PK)             |
 | name, location     |                 | role, status, pin   |
 +--------------------+                 | password_hash       |
         ^                              +---------------------+
         | 1:N                             ^             ^
         |                                 | 1:N         | 1:N
 +--------------------+                    |             |
 |     GATE_LOGS      |--------------------+             |
 |--------------------| (operator_id)                    |
 | id (PK)            |                                  |
 | student_id (FK)    |----------------------+           |
 | operator_id (FK)   |                      |           |
 | gate_id (FK)       |                      v           |
 +--------------------+             +------------------+ |
                                    |     STUDENTS     |-+ (parent_id/warden_id)
 +--------------------+             |------------------|
 |    GATE_PASSES     |------------>| id (PK), roll    |
 |--------------------| (student_id)| name, department |
 | id (PK)            |             | parent_id (FK)   |
 | student_id (FK)    |             +------------------+
 | parent_status      |                      ^
 | admin_status       |                      | 1:1
 | final_status       |             +------------------+
 +--------------------+             | CAMPUS_OCCUPANCY |
                                    |------------------|
                                    | student_id (PK)  |
                                    | current_status   |
                                    +------------------+
```

---

### 3.2 Table Schema Definitions

#### 3.2.1 `gates`
Stores physical campus gate locations and terminal properties.
```sql
CREATE TABLE gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL, -- 'MAIN', 'HOSTEL', 'PEDESTRIAN', 'VEHICLE'
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

#### 3.2.2 `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  employee_id TEXT,
  email TEXT,
  phone TEXT,
  gate_id UUID REFERENCES gates(id),
  pin TEXT,
  parent_id UUID REFERENCES users(id),
  supervised_gates TEXT[],
  assigned_hostel TEXT,
  is_hod BOOLEAN,
  department_id TEXT,
  can_view_gender TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED', 'DEPROVISIONED')),
  password_hash TEXT NOT NULL,
  pin_hash TEXT,
  login_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3.2.3 `students`
Master record for enrolled students.
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  section TEXT NOT NULL,
  batch TEXT NOT NULL,
  photo TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_id UUID REFERENCES users(id),
  qr_code TEXT NOT NULL,
  id_valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL, -- 'ACTIVE', 'SUSPENDED', 'ALUMNI'
  student_type TEXT CHECK (student_type IN ('HM', 'HF', 'DM', 'DF')), -- Hostel/Day scholar Male/Female
  gender TEXT CHECK (gender IN ('male', 'female')),
  hostel_block TEXT,
  room_number TEXT,
  hostel_curfew_time TEXT,
  warden_id UUID REFERENCES users(id)
);
```

#### 3.2.4 `gate_passes`
Tracks digital pass applications, hierarchical approval status, and validity windows.
```sql
CREATE TABLE gate_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  roll TEXT NOT NULL,
  student_name TEXT NOT NULL,
  department TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('Home Out', 'Day Out', 'Leave', 'Regular')),
  from_datetime TIMESTAMPTZ NOT NULL,
  to_datetime TIMESTAMPTZ NOT NULL,
  description TEXT,
  requested_by_id UUID REFERENCES users(id),
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (parent_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED')),
  admin_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (admin_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED')),
  final_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (final_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED')),
  parent_comment TEXT,
  admin_comment TEXT,
  parent_approver_id UUID REFERENCES users(id),
  admin_approver_id UUID REFERENCES users(id),
  qr_code TEXT NOT NULL
);
```

#### 3.2.5 `gate_logs`
Immutable record of scan events and physical gate crossings.
```sql
CREATE TABLE gate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  roll TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reason TEXT CHECK (reason IN ('Home Out', 'Day Out', 'Leave', 'Regular')),
  gate_id UUID NOT NULL REFERENCES gates(id),
  gate_name TEXT NOT NULL,
  operator_id UUID NOT NULL REFERENCES users(id),
  operator_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  is_correction BOOLEAN NOT NULL DEFAULT FALSE,
  original_scan_id UUID REFERENCES gate_logs(id),
  correction_reason TEXT
);
```

#### 3.2.6 `campus_occupancy`
Real-time state table for student location tracking.
```sql
CREATE TABLE campus_occupancy (
  student_id UUID PRIMARY KEY REFERENCES students(id),
  current_status TEXT NOT NULL CHECK (current_status IN ('IN', 'OUT')),
  last_gate_id UUID REFERENCES gates(id),
  last_log_id UUID REFERENCES gate_logs(id),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3.2.7 `audit_logs` & `sessions`
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  details TEXT NOT NULL,
  gate_id UUID REFERENCES gates(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ
);
```

---

## 4. Key Performance Indexes & Security Triggers

### 4.1 Index Strategy
- `idx_students_roll`: Fast B-Tree lookups on student roll numbers during scanner operations.
- `idx_gate_logs_timestamp`: Accelerated time-range queries for live dashboards & reports.
- `idx_gate_logs_student_id` & `idx_gate_passes_student_id`: Optimized relational JOIN operations.
- `idx_campus_occupancy_status`: Rapid aggregation for on-campus vs off-campus metrics.

### 4.2 Security Triggers & Invalidation System
1. **Session Invalidation Notification**: Automatic `pg_notify` on role or account status changes.
2. **SECURITY DEFINER Functions**:
   - `create_user_with_auth`: Restricts user creation strictly to system administrators with role validation.
   - `delete_user_with_auth`: Restricts user deletion to system administrators and prevents self-deletion.
