# Dean — how it works

## Overview
The Dean role at JNTUH CEJ encompasses senior executive academic and student governance, aligning primarily with the Associate Dean (Academics) and Associate Dean (Student Affairs). The role provides an institutional oversight bridge sitting between departmental Heads of Departments (HODs) and the Principal.

In the institutional escalation and approval structure, the Dean exercises senior oversight over academic integrity, student discipline, and academic status modifications. The Dean serves as an essential approver in the **two-person approval chain** required for critical student standing updates—such as approving a `DEBARRED` or `SUSPENDED` status initiated by an HOD or the Chief Warden. A student flagged for severe misconduct or chronic shortage cannot be permanently debarred by an HOD alone; the decision requires Dean or Principal sign-off, which immediately locks gate permissions and examination eligibility.

The Dean also has access to campus-wide governance, system administration reports, and academic status consoles.

## Pages & workflows

### 1. Academic Standing & Status Governance
* **Academic Status Console (`/sysadmin/academic-status`):** The primary operational interface where the Dean reviews students flagged for disciplinary actions, attendance shortages, or academic disqualifications.
* **Two-Person Debarment Chain:** When an HOD flags a student as debarred in their department, or when the Chief Warden escalates a major hostel violation, the record enters the pending academic status queue. The Dean inspects the case history, evidence, and HOD notes before co-signing the final debarment order.

### 2. Institutional Compliance & Oversight
* **Governance & Delegation Audits:** Reviews institutional delegations and cross-departmental academic policies.
* **Campus Safety & Disciplinary Coordination:** Tracks safety alerts, anti-ragging incident reports, and student welfare grievances requiring college-level intervention.

## Key API endpoints

| Endpoint | Method(s) | What it does |
|---|---|---|
| `/admin/overview` | `GET` | Fetches institutional health, student population statistics, and governance summaries. |
| `/admin/audit-logs` | `GET` | Queries tamper-evident institutional audit logs across all departments and roles. |
| `/admin/alerts` | `GET,POST` | Retrieves system-wide alerts, safety incidents, and disciplinary warning flags. |
| `/admin/anti-ragging-alert-config` | `GET,PATCH` | Inspects and configures campus anti-ragging alert thresholds and notification matrices. |
| `/admin/exceptions` | `GET` | Reviews academic and administrative gate access exceptions granted campus-wide. |
| `/admin/governance/compliance/overview` | `GET` | Provides NAAC/NBA compliance and regulatory adherence reporting views. |
| `/admin/lockdown` | `DELETE,GET,POST` | Reviews active emergency lockdown statuses and campus containment states. |
| `/admin/permission-policies` | `GET` | Inspects global permission rules governing passes, curfews, and gate policies. |
| `/admin/reports` | `GET,POST` | Generates institutional reports on student discipline, attendance, and governance. |
| `/admin/safety/overview` | `GET` | Compiles campus safety, security breach, and emergency response statistics. |
| `/admin/student-representatives` | `GET,POST` | Manages formal student council and representative records. |
| `/auth/session` | `GET` | Revalidates Dean session and active JWT claims against the authentication server. |

## Data flow
1. **Disciplinary Flagging:** An incident occurs (e.g., severe hostel violation or academic malpractice). The HOD or Chief Warden flags the student for status change via `/api/academic-status` (moving status to `PENDING`).
2. **Review Queue:** The student retains gate access while in the `PENDING` state. The request appears on the Dean's review queue (`/sysadmin/academic-status`).
3. **Evaluation:** The Dean reviews the incident report, student defense, and departmental recommendations.
4. **Approval & Enforcement:** The Dean approves the sanction. The API validates that the approver is distinct from the initiator. Upon confirmation:
   - Student state transitions to `DEBARRED` or `SUSPENDED`.
   - Gate access is immediately disabled via the access control subsystem.
   - Examination hall tickets and registration eligibility are revoked.

## Security notes
* **Authentication:** Authenticated via rotating JWT tokens stored in HttpOnly cookies and Bearer headers, revalidated by `/api/auth/session`.
* **Two-Person Integrity Rule:** Enforces separation of powers—no single official can unilaterally debar a student without independent two-person authorization (HOD/Chief Warden flag + Dean/Principal approval).
* **RBAC & Authorization:** Server-side route handlers enforce access via `withAuthorization({ requiredRole: ['dean', ...] })`. UI elements are protected with `AuthGuard allowedRoles={['dean', ...]}`.
* **Audit Trail:** Every action on the academic status console writes an immutable audit record containing the approver's user ID, IP address, and rationale.
