# CROSS-ROLE FORENSICS

**Date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Conflicts

### 1.1 Approver capability asymmetry
The same `PATCH /api/permissions/[ticket]` endpoint is:
- **Inline actionable** in VP (pending-approvals:110)
- **Detail-panel actionable** in HOD (ApprovalsView → DetailSheet → PermissionDetailPanel:363)
- **Command-bar actionable** in caretaker (CaretakerCommandBar:171)
- **Read-only in kanban queue** in OIE (KanbanBoard + EntityInspector). **Actionable via `OieCommandBar` in `RoleConsole`** (`OieCommandBar.tsx:266`, wired into `RoleConsole.tsx:1195`). Gap: command bar not inlined in kanban.
- **Read-only** in supervisor (EscalationsView, comment: "the inspector never invents one")
- **Not present** in dean/chief_warden (no UI surface)

**Root cause:** Each role surface was built independently. The approval action was added to VP, HOD (via detail panel), and caretaker (via command bar), but NOT to OIE, supervisor, or the entity-aligned roles. The backend allows all of them to act; the UI does not.

### 1.2 Read-only surfaces that look actionable
- `/supervisor/response/escalations` — title says "response", but no response button.
- `/oie/queue/pending` — title says "pending", implying action needed, but no action button.
- `/hod/approvals/pending` — title says "pending", HOD can act via detail panel but not inline.

**Impact:** Users form the mental model "I can act here" from the page title, then discover they cannot. This is a **fake-completeness** pattern.

## 2. Workflow Handoffs

### 2.1 Pass approval chain
```
Student creates → HOD approves → VP co-signs → OIE/Exam verifies → Gate operator scans → Guardian notified
```
- **Handoff HOD→VP:** Clean. Ticket status changes PENDING→APPROVED (HOD stage)→PENDING (VP stage).
- **Handoff VP→OIE:** Clean for exam passes. OIE sees PENDING exam-access tickets.
- **Handoff OIE→Gate:** BROKEN for OIE. OIE cannot approve/reject from its own surface. The ticket must be acted on by VP or caretaker. If OIE is the final approver before the gate, the handoff fails.
- **Handoff Gate→Guardian:** BROKEN. Guardian's pass-timeline fetch (`/api/pass-requests`) 404s. Guardian never sees the pass.

### 2.2 Complaint flow
```
Student files → Admin/Caretaker triages → Resolution → Feedback
```
- Clean handoff. Student sees status on `/student/complaints/[id]`.

### 2.3 Mess token flow
```
Mess-incharge issues → Student verifies → Consumption tracked
```
- Clean. No handoff failures observed.

## 3. Shared Components

### 3.1 `PermissionDetailPanel` (shared approver component)
Used by: HOD (DetailSheet), VP (pending-approvals), caretaker (command bar fallback).
- Has APPROVE/REJECT/FORWARD/ESCALATE actions.
- **Not used by OIE or supervisor** — they use `EntityInspector` instead (read-only).

### 3.2 `EntityInspector` (read-only inspector)
Used by: OIE (kanban), supervisor (escalations), admin (passes, students).
- Inspection-only. No action buttons.
- **Gap:** OIE and supervisor need `PermissionDetailPanel` (or equivalent) to act on tickets.

### 3.3 `KanbanBoard` (shared board component)
Used by: OIE queue, possibly others.
- Read-only display. No card action buttons.
- **Gap:** If the kanban is meant to be actionable, it needs per-card action buttons.

## 4. Experience Inconsistencies

| Inconsistency | Where | Impact |
|---|---|---|
| HOD can act via detail panel; OIE kanban is read-only but OIE has command bar in RoleConsole | HOD vs OIE queue | OIE must navigate to RoleConsole to act; discoverability gap |
| VP has inline PATCH; HOD has detail-panel PATCH; caretaker has command-bar PATCH | 3 different UX patterns for the same action | Cognitive load; no consistent muscle memory |
| Supervisor "response" pages have no response button | `/supervisor/response/*` | Fake-completeness |
| 2 `alert()` calls in an app that otherwise uses inline banners | `student/mess-bill:46`, `sysadmin/actions:150` | Inconsistent error handling |
| 161 stub/redirect/thin-shell pages out of 441 | All role groups | URL namespace looks complete; content is not |
| 6 entity-aligned roles have no UI | dean, chief_warden, controller_*, addl_controller_* | Auth-only roles; user lands on `/login` |

## 5. Information Gaps

| Gap | Affected Roles | Impact |
|---|---|---|
| Guardian pass timeline broken | guardian, parent | Cannot see ward's passes |
| No bulk approval UI | HOD, VP, caretaker | 1-at-a-time approval for 30+ tickets |
| No two-person academic-status UI | dean, principal, VP, chief_warden | Maker/checker loop incomplete |
| No faculty roster edit UI | faculty, hod | Roster editing unreachable |
| OIE action UI exists in RoleConsole (`OieCommandBar`) but is not inlined in kanban queue | OIE, exam_branch, exam_superintendent | Exam access CAN be approved via RoleConsole; gap is discoverability from kanban |
| No supervisor escalation resolution UI | supervisor | Escalations visible but not resolvable |
