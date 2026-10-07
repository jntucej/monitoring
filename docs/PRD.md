# Product Requirements Document (PRD)

## 📌 GATE MONITOR: Campus Access & Security Management Platform

**Document Version:** 2.0.0  
**Target Organization:** JNTUH College of Engineering Jagtial (JNTUH CEJ)  
**Status:** Production-Ready Specification  
**Classification:** Technical & Operational Requirements  

---

## 1. Executive Summary & Product Vision

### 1.1 Product Vision
**Gate Monitor** is an enterprise-grade campus security, gate access, and occupancy management system designed specifically for higher education institutions. The platform transitions traditional manual paper-register gate workflows into a real-time, biometrically verifiable, digital QR-based movement tracking platform.

### 1.2 Problem Statement
Traditional university gate management suffers from significant vulnerabilities and operational friction:
1. **Manual Entry Bottlenecks:** Paper registers slow down student and vehicle movement during peak hours (8:00 AM – 10:00 AM and 4:00 PM – 6:00 PM).
2. **Proxy & Identity Fraud:** Pass sharing, physical identity card swapping, and unauthorized off-campus outings.
3. **Lack of Real-Time Visibility:** Campus administration and hostel wardens have no instant insights into who is currently inside campus vs. outside.
4. **Delayed Guardian Communication:** Parents receive delayed or no notification regarding their ward's movements and curfew status.
5. **Disconnected Outpass Approvals:** Outing passes approved manually by wardens or HODs are difficult to verify instantly at gate terminals.

### 1.3 Core Objectives & Value Proposition
* **Instant Gate Verification:** Sub-second (<300ms) QR scan and biometric lookup at gate checkpoints.
* **Granular Role-Based Access:** Unified support for Students, Faculty, Staff, Campus Workers, Visitors, Wardens, HODs, Gate Operators, Campus Admins, and System Admins.
* **Parent & Warden Integration:** Automated outing approval workflows and instant SMS/Email/Push notifications for parents upon gate check-in/check-out.
* **Campus Digital Twin & Occupancy Tracking:** Live headcounts per department, hostel block, and gate, paired with predictive movement analytics.
* **Resilient Offline Operations:** Local offline scanning queue on operator devices with automatic background synchronization when network connectivity restores.

---

## 2. Target User Roles & Persona Matrix

| Role Key | Role Name | Primary Operational Goals | Access Level |
| :--- | :--- | :--- | :--- |
| `sysadmin` | System Administrator | System provisioning, security audit logs, backups, LDAP/SSO sync, system health monitoring. | Global Infrastructure Access |
| `admin` | Campus Administrator | Campus occupancy oversight, policy settings, analytics export, digital twin view, sustainability reports. | Administrative Operations |
| `operator` | Gate Security Guard | QR scanning, biometric thumbprint/WebAuthn validation, manual visitor entry, exit reason tagging. | Gate Mobile/Desktop Terminal |
| `warden` | Hostel Warden | Hostel curfew management, student leave/outing pass verification and multi-tier approval. | Hostel & Outpass Domain |
| `hod` / `faculty` | HOD & Teaching Staff | Academic outpass approvals, departmental attendance monitoring, faculty movement logs. | Department Domain |
| `staff` / `worker` | Campus Employees | Shift check-in/check-out, digital ID card access, work schedule verification. | Employee Portal |
| `student` | Enrolled Student | Display digital ID card, request outing/day passes, view pass approval status and movement history. | Student Portal |
| `guardian` / `parent` | Parent / Guardian | Track ward's real-time campus entry/exit, receive curfew alerts, submit outpass requests remotely. | Parent Portal |
| `visitor` | Guest / Vendor | Temporary digital pass request, host approval verification, physical visitor badge scanning. | Visitor Check-in Desk |

---

## 3. Detailed Functional Requirements

### 3.1 Authentication & Security Infrastructure
* **FR-1.1 (Multi-Factor Login):** Support for PIN-based rapid login for Gate Operators, Password/Email login for Admins, and WebAuthn / Passkeys for high-security roles.
* **FR-1.2 (Session Revocation):** Single-active-session policy enforcement for Gate Operators with remote session termination capabilities for System Admins.
* **FR-1.3 (Role-Based Authorization):** Server-side RBAC middleware guaranteeing strict URL route and API endpoint protection based on role permissions.


### 3.2 Digital Gate Scanning & Entry/Exit Engine
* **FR-2.1 (Multi-Mode Scanning):**
  * Dynamic Time-based OTP (TOTP) QR code generation on student digital ID cards.
  * WebAuthn / FIDO2 thumbprint scanner integration for biometric gate verification.
  * Manual roll number / unique ID lookup dialog for fallback scenarios.
* **FR-2.2 (Verification Logic):**
  * Check active pass permissions, curfew windows, and administrative flag status (e.g., `SUSPENDED`, `FLAGGED`).
  * Tag exit reasons (e.g., `LUNCH_BREAK`, `MEDICAL_EMERGENCY`, `OFFICIAL_WORK`, `WEEKEND_OUTING`).
  * Display high-contrast success/failure indicators with operator audio cues.
* **FR-2.3 (Offline Gate Resilience):**
  * Local queueing of scan events in client storage during internet outages.
  * Automatic replay and background sync with exponential backoff upon reconnection.

### 3.3 Pass & Outing Approval Workflow
* **FR-3.1 (Pass Generation):** Support for Day Passes, Outing Passes, Emergency Passes, and Visitor Passes.
* **FR-3.2 (Multi-Tier Approval Hierarchy):**
  * *Student Request* ➔ *Parent Consent (via SMS/App)* ➔ *Warden Approval* ➔ *Gate Operator Verification*.
* **FR-3.3 (Curfew & Overdue Tracking):**
  * Automated tracking of expected return times.
  * Auto-escalation and alert triggers to Wardens and Parents when a student exceeds return curfew windows.

### 3.4 Campus Occupancy & Digital Twin Analytics
* **FR-4.1 (Live Headcount Streaming):** Real-time Server-Sent Events (SSE) / WebSocket streams of total active campus occupancy, broken down by category (Students, Staff, Visitors).
* **FR-4.2 (Campus Digital Twin):** Visual interactive heatmap displaying occupancy density across gates, hostels, and academic blocks.
* **FR-4.3 (Predictive AI Analytics):** Predictive hourly entry/exit traffic model forecasting gate load for optimal guard staffing.

### 3.5 Sustainability & System Auditing
* **FR-5.1 (Carbon Footprint Tracking):** Sustainability dashboard measuring paper savings from digital passes and estimated carbon savings from optimized campus gate transport flows.
* **FR-5.2 (Immutable System Audit Trail):** Structured logging of all administrative actions, pass creation, role changes, and gate overrides with IP and timestamp metadata.

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Performance & Scalability
* **NFR-1 (Latency):** End-to-end QR code scan verification response time must be under **300ms** on standard 4G/Wi-Fi connections.
* **NFR-2 (Throughput):** Concurrent handling of up to **100 scans per minute** per gate terminal during peak rush hours.
* **NFR-3 (Data Payload):** Lightweight client payload (<50KB initial state) optimized for mobile operator tablets.

### 4.2 Security & Data Privacy
* **NFR-4 (Encryption):** All data in transit encrypted via **TLS 1.3**. Cryptographic passwords hashed using **Bcrypt** (cost factor 10). Dynamic QR codes signed with HMAC-SHA256.
* **NFR-5 (Data Protection):** Compliance with data privacy guidelines (e.g., DPDP Act). Student personal details accessible only to authorized wardens and administrators.
* **NFR-6 (Auditability):** Unalterable audit trail stored with Row Level Security (RLS) in PostgreSQL.

### 4.3 Availability & Reliability
* **NFR-7 (Uptime):** System availability SLA of **99.9%** during active campus operational hours (06:00 AM to 11:00 PM IST).
* **NFR-8 (Offline Persistence):** Gate scanner offline storage capability up to **5,000 local scan events** without data loss.

---

## 5. Key Success Metrics (KPIs)

1. **Gate Processing Time:** Average gate throughput reduced from **45 seconds/person** (manual) to **< 3 seconds/person** (digital QR/biometric).
2. **Outing Compliance Rate:** 100% real-time tracking of hostel student return times with zero unflagged curfew violations.
3. **Parent Alert Latency:** Parent notification dispatch within **< 5 seconds** of gate scan.
4. **Offline Resilience:** 0% lost gate records during internet connectivity outages.
