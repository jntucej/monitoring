# ISSUE_INDEX.md — V4.5-AFX Reconciled Registry (45 Findings)

| ID | Role | Priority | Status | Resolution / Evidence |
|---|---|---|---|---|
| F-GU-01 | guardian | P0 | VERIFIED_FIXED | `/api/pass-requests` removed; `guardian/child-status` uses `/api/permissions` + `statusError` + `Retry` (`3c3ef397`) |
| F-GU-02 | guardian | P0 | VERIFIED_FIXED | Linked guardian pages point to working `child-status` with `?wardId=` (`ec531295`) |
| F-HOD-01 | hod | P1 | VERIFIED_FIXED | `ApproverDecisionQueue` mounted on `/hod/approvals/pending` & `/escalated` (`4767c161`, `7e6dc90a`) |
| F-HOD-02 | hod | P1 | VERIFIED_FIXED | `POST /api/permissions/bulk` wired in `ApproverDecisionQueue` (`cf22cd7c`) |
| F-VP-01 | vice_principal | P1 | VERIFIED_FIXED | `ApproverDecisionQueue` + bulk wired on `/vice-principal/pending-approvals` (`4767c161`, `cf22cd7c`) |
| F-SP-02 | supervisor | P1 | VERIFIED_FIXED | `ApproverDecisionQueue` mounted on `/supervisor/response/{escalations,incidents,exceptions}` (`cf22cd7c`, `65d2680c`) |
| F-SP-03 | supervisor | P1 | VERIFIED_FIXED | Supervisor can Acknowledge/Approve/Reject/Forward/Escalate inline (`cf22cd7c`) |
| F-SA-01 | sysadmin | P1 | VERIFIED_FIXED | `alert()` replaced with inline `role="alert"` + `Retry` on `/sysadmin/actions` (`54e7b476`) |
| F-SA-02 | sysadmin | P1 | VERIFIED_FIXED | `GET/POST /api/academic-status/pending` wired on `/sysadmin/academic-status` (`cf22cd7c`) |
| F-EA-01 | entity-aligned | P1 | VERIFIED_FIXED | `dean`, `chief_warden`, `controller_examinations`, `addl_controller_*` mapped in `src/server/policy/routes.ts` (`cf22cd7c`) |
| F-EA-02 | dean | P1 | VERIFIED_FIXED | `dean` mapped to `/sysadmin/academic-status` with `PermissionScopeHint` (`cf22cd7c`, `a816cc94`) |
| F-OIE-01 | oie | P2 | VERIFIED_FIXED | `ApproverDecisionQueue` mounted on `/oie/queue/pending`, `/oie/examination-day-access`, and `/oie/queue/escalated` (`cf22cd7c`, `fe4b3543`, `4f4c42fe`) |
| F-OIE-02 | oie | P2 | VERIFIED_FIXED | Inline `ApproverDecisionQueue` + `ContextualActionRow` paired with `EntityInspector` (`4f4c42fe`) |
| F-ST-01 | student | P2 | VERIFIED_FIXED | `alert()` replaced with inline `role="alert"` + `Retry` on `/student/mess-bill` (`6e4c827e`) |
| F-FA-01 | faculty | P2 | VERIFIED_FIXED | 3 `/faculty/subject/*` `EmptyState` stubs replaced with redirects (`2aa1535f`, `7333c227`) |
| F-FA-02 | faculty | P2 | VERIFIED_FIXED | `FacultyRosterPanel` (`PATCH /api/faculty/attendance/roster`) verified mounted in `faculty/class/[id]/page.tsx` |
| F-AD-01 | admin | P2 | VERIFIED_FIXED | `POST /api/permissions/[ticket]/revoke` + `InlineDiffBadge` wired in `/admin/passes` (`2aa1535f`, `ae5e1ee2`) |
| F-SA-04 | sysadmin | P2 | VERIFIED_FIXED | `POST /api/sysadmin/autonomous-monitoring` wired in `/sysadmin/autonomous` (`7333c227`) |
| F-CA-01 | caretaker | P2 | VERIFIED_FIXED | Clickable quick command chips added to `CaretakerCommandBar.tsx` + `RoleStarterGuide` on `/caretaker/home` (`fc0b1d0e`, `8875a7cf`) |
| F-ME-01 | mess_incharge | P2 | VERIFIED_FIXED | `POST /api/mess/menu-items` wired on `/mess/menu-management` + `LivePulseStrip` & `SmartCrossLinkChip` on `/mess/inventory-stock` (`2aa1535f`, `b2d51526`) |
| F-OP-03 | operator | P2 | VERIFIED_FIXED | Offline queue verified in `src/app/(operator)/gate/[gateId]/page.tsx` |
| F-DW-01 | deputy_warden | P2 | VERIFIED_FIXED | `ApproverDecisionQueue` mounted on `/deputy-warden/curfew-oversight` + `LivePulseStrip` on `/deputy-warden/home` (`4767c161`, `44706eb3`) |
| F-HM-01 | hostel_manager | P2 | VERIFIED_FIXED | `ApproverDecisionQueue` on `/hostel-manager`, `ComplaintConsole` on `/complaints`, `PermissionScopeHint` on `/allocation` (`4767c161`, `44706eb3`) |
| F-EX-01 | exam_* | P2 | VERIFIED_FIXED | `ApproverDecisionQueue` mounted on `/exam-branch/oie-approval-requests` & `/exam/superintendent` (`4767c161`) |
| F-OP-01 | operator | P3 | VERIFIED_FIXED | `usePolling` verified across 8 operator pages |
| F-OP-02 | operator | P3 | VERIFIED_FIXED | Quick scan reclassification (`PATCH /api/operator/scans/[id]/category`) + `WhatHappenedReceipt` wired in `/operator/transactions` (`6aefaad8`) |
| F-ST-02 | student | P3 | VERIFIED_FIXED | `/student/gate-pass` & `/student/pass-application` verified as clean single-hop redirects |
| F-ST-03 | student | P3 | VERIFIED_FIXED | Escalation links added to `student/{exams,marks,fees,library,scholarships}` (`6a76e828`) |
| F-ST-04 | student | P3 | VERIFIED_FIXED | 30s `usePolling` added to `ComplaintConsole.tsx` (`789d8dfe`) + `student/permissions/page.tsx` |
| F-AD-02 | admin | P3 | VERIFIED_FIXED | `/admin/dashboard` flattened to single-hop redirect to `/admin/overview` (`2acb89e3`) |
| F-VP-03 | vice_principal | P3 | VERIFIED_FIXED | `/vice-principal/examinations` flattened to redirect to `/vice-principal/examination-coordination` (`2acb89e3`) |
| F-EM-01 | emo | P3 | VERIFIED_FIXED | `ComplaintConsole` (`PATCH /api/complaints/[id]`) + `LivePulseStrip` on `/emo` (`44706eb3`) |
| F-GU-03 | guardian | P3 | VERIFIED_FIXED | `guardian/pass-leave-submission` (`POST /api/permissions`) + `?wardId=` pre-selection (`df21d8ea`) |
| F-SP-01 / F-SP-04 | supervisor | P2 | PARTIALLY_FIXED | Response pages (`escalations`, `incidents`, `exceptions`) are actionable; 16 thin re-export stubs remain intentionally as route aliases |
| F-AD-03 / F-AD-04 / F-SA-03 / F-VP-02 / F-PR-02 / F-OIE-03 / F-HOD-03 | various | P3 | PARTIALLY_FIXED | Core operational & approval paths are live; secondary read-only/alias pages remain intentionally read-only |
| F-ME-02 / F-PR-01 / F-FA-03 / F-VI-01 | various | INFO | VERIFIED_FIXED | Informational findings confirmed |
