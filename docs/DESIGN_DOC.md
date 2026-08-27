# System Design & Architecture Document

## 🏗️ GATE MONITOR: System Architecture & Technical Specifications

**Document Version:** 2.0.0  
**Target Organization:** JNTUH College of Engineering Jagtial (JNTUH CEJ)  
**Status:** Approved System Architecture  
**Classification:** Technical Design & System Architecture  

---

## 1. High-Level Architecture Overview

Gate Monitor follows a modern full-stack web & edge architecture built around **Next.js (App Router)** and **Supabase (PostgreSQL with Row Level Security)**. The system is designed for ultra-low latency gate scanning, real-time status streaming, and resilient offline execution.

```
[ Gate Mobile/Desktop Terminals ]      [ Student / Parent / Warden / Admin Apps ]
      │                                                │
      ├───────────────────────┬────────────────────────┘
      │ (HTTPS / WebSockets)  │ (REST / SSE)
      ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Edge Middleware                      │
│      - Session Auth Guard & JWT Validation                      │
│      - Rate Limiting (rate-limiter-flexible)                    │
│      - Role-Based Access Control (RBAC Routing)                 │
└────────────────────────────────┌────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API & Server Layer                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Gate Scan Engine │  │ Outpass Workflow │  │ Biometric Auth│  │
│  │ (/api/gate/scan) │  │  (/api/passes)   │  │ (WebAuthn/MFA)│  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                    │          │
│  ┌────────┴─────────┐  ┌────────┴─────────┐  ┌───────┴───────┐  │
│  │ Occupancy Stream │  │ AI Analytics Mod │  │ Audit Logger  │  │
│  │ (/api/occupancy) │  │ (/api/analytics) │  │ (/lib/audit)  │  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Infrastructure                      │
│  ┌────────────────────────┐         ┌────────────────────────┐  │
│  │ PostgreSQL Database    │         │ Supabase Realtime      │  │
│  │  - Row Level Security  │         │  - WebSocket Broadcast │  │
│  │  - Triggers & Functions│         │  - Occupancy Channels  │  │
│  └────────────────────────┘         └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystem Architecture

### 2.1 Gate Scan & Biometric Processing Pipeline
1. **QR / Biometric Capture:** Operator terminal captures TOTP dynamic QR code via device camera or biometric WebAuthn thumbprint hardware interface.
2. **Payload Verification:** Request posted to `/api/gate/scan` containing `uniqueId`, `gateId`, `scanType` (`ENTRY`/`EXIT`), and `exitReason`.
3. **Database Check & Rules Engine:**
   * Validates active pass in `passes` table (matches valid time range and status `APPROVED`).
   * Validates flag status in `persons` table (`SUSPENDED` or `FLAGGED` halts entry).
   * Validates curfew hours for hostel residents (`hostel_curfew_time`).
4. **Log Immutable Event:** Inserts record into `gate_logs` and increments/decrements active gate count in `occupancy`.
5. **Real-time Broadcast:** Triggers SSE broadcast to admin dynamic dashboard and dispatches async parent notification via SMS/Push queue.

### 2.2 Offline Operations & Conflict Resolution Strategy
* **Local Storage Layer:** Operator devices leverage Zustand local storage / IndexedDB queue (`offlineQueue.ts`).
* **Offline Queue Logic:** If network drops during scan, event is assigned a local UUID timestamped client payload and marked `STATUS_PENDING`.
* **Background Sync Handler:** When network reconnects, `OfflineScanManager.tsx` flushes queued items sequentially to `/api/gate/offline`.

---

## 3. Database Schema & Data Modeling

The relational backend is implemented in **PostgreSQL** hosted on **Supabase** with strict Row-Level Security (RLS) policies.

```
                   ┌───────────────────┐
                   │       users       │
                   └─────────┬─────────┘
                             │ 1:1
                   ┌─────────▼─────────┐
                   │      persons      │
                   └────┬───────────┬──┘
             1:1    │           │    1:1
   ┌────────────────▼─┐       ┌─▼─────────────────┐
   │ student_details  │       │ employee_details  │
   └──────────────────┘       └───────────────────┘
            │ 1:N                      │ 1:N
   ┌────────▼─────────┐       ┌────────▼──────────┐
   │      passes      │       │     gate_logs     │
   └──────────────────┘       └───────────────────┘
```

### 3.1 Primary Entity Definitions

#### `users` Table
Stores user account authentication metadata, credentials hash, active sessions, and base assigned role.
* `id` (UUID, Primary Key)
* `email` (TEXT, Unique)
* `unique_id` (TEXT, Unique - e.g., Roll number or Employee ID)
* `role` (TEXT - `operator`, `admin`, `sysadmin`, `warden`, `faculty`, `student`, `guardian`, `worker`)
* `password_hash` (TEXT)
* `pin` (TEXT, Hashed rapid login PIN)
* `status` (TEXT - `ACTIVE`, `LOCKED`, `SUSPENDED`)
* `current_session_token` (TEXT)

#### `persons` Table
Unified identity record representing any physical individual interacting with campus gates.
* `id` (UUID, Primary Key, FK -> users.id)
* `unique_id` (TEXT, Indexed)
* `full_name` (TEXT)
* `person_type` (TEXT - `student`, `faculty`, `staff`, `worker`, `visitor`, `parent`)
* `department` (TEXT)
* `phone` (TEXT)
* `photo_url` (TEXT)
* `qr_code` (TEXT)
* `has_thumbprint` (BOOLEAN)
* `flag_status` (TEXT - `NONE`, `FLAGGED`, `SUSPENDED`)

#### `student_details` Table
Extended academic and residential metadata for students.
* `person_id` (UUID, FK -> persons.id)
* `roll` (TEXT, Unique, Indexed)
* `year` (INTEGER), `section` (TEXT), `batch` (TEXT)
* `guardian_id` (UUID, FK -> users.id)
* `student_type` (TEXT - `DAY_SCHOLAR`, `HOSTELER`)
* `hostel_block` (TEXT), `room_number` (TEXT)
* `hostel_curfew_time` (TIME)
* `warden_id` (UUID, FK -> users.id)

#### `gate_logs` Table
High-frequency transaction ledger recording every gate passage event.
* `id` (UUID, Primary Key)
* `person_id` (UUID, FK -> persons.id)
* `gate_id` (UUID, FK -> gates.id)
* `operator_id` (UUID, FK -> users.id)
* `scan_type` (TEXT - `ENTRY`, `EXIT`)
* `exit_reason` (TEXT - `LUNCH_BREAK`, `OFFICIAL`, `OUTING`, `HOME`, `EMERGENCY`)
* `pass_id` (UUID, FK -> passes.id, Nullable)
* `verified_by_biometric` (BOOLEAN)
* `timestamp` (TIMESTAMPTZ, Default NOW(), Indexed)

#### `passes` Table
 डिजिटल outpass & visitor permits.
* `id` (UUID, Primary Key)
* `person_id` (UUID, FK -> persons.id)
* `pass_type` (TEXT - `DAY_OUTING`, `SPECIAL_LEAVE`, `VISITOR_PASS`, `EMERGENCY`)
* `status` (TEXT - `PENDING_PARENT`, `PENDING_WARDEN`, `APPROVED`, `REJECTED`, `EXPIRED`, `USED`)
* `valid_from` (TIMESTAMPTZ), `valid_until` (TIMESTAMPTZ)
* `approved_by` (UUID, FK -> users.id)
* `reason` (TEXT)

---

## 4. API & Interface Specifications

| Method | Endpoint Route | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns secure session cookie. |
| `POST` | `/api/auth/pin-login` | Operator / Warden | Rapid 8-digit PIN validation for gate guard terminals. |
| `POST` | `/api/gate/scan` | Operator | Validates person QR/biometric and writes entry/exit gate log. |
| `POST` | `/api/gate/verify-thumbprint` | Operator | Validates FIDO2/WebAuthn biometric signature at gate terminal. |
| `GET` | `/api/occupancy/stream` | Admin / SysAdmin | Real-time Server-Sent Events (SSE) streaming live campus headcount. |
| `POST` | `/api/passes` | Student / Parent | Requests a new outpass or day leave approval permit. |
| `PUT` | `/api/passes/[passId]` | Warden / HOD | Approves, rejects, or revokes student leave pass. |
| `GET` | `/api/analytics/advanced` | Admin | Fetches movement analytics, peak traffic hours, and curfew stats. |
| `POST` | `/api/admin/lockdown` | SysAdmin | Triggers emergency campus security lockdown mode. |

---

## 5. Security & Threat Mitigation Architecture

1. **Authentication Guard Middleware (`src/middleware/auth.ts`):** Intercepts every incoming request, validates JWT session integrity, and enforces IP allowlisting for admin routes.
2. **Dynamic TOTP QR Security:** Student QR codes refresh dynamically using timestamped HMAC keys to prevent static screenshot pass reuse.
3. **Emergency Lockdown Protocol:** System Administrators can initiate campus lockdown via `/api/admin/lockdown`, instantly invalidating all outward passes and locking exit gates.
4. **Data Retention & Anonymization Policies:** Automatic background retention runner (`/api/admin/retention/run`) archives gate logs older than 365 days and anonymizes sensitive visitor data.

* **Conflict Resolution:** Server evaluates events using server timestamp precedence while retaining historical gate log sequence integrity.
