# Gate Monitor — UI Interaction Inventory

**Date:** 2026-11-26  
**Scope:** 467 `page.tsx` routes, 675 `.tsx` components, 1,654 scanned source files.

## 1. Dead Links Fixed (8 → 0 remaining)

| File | Line(s) | Broken Target | Fixed Target | Status |
|---|---|---|---|---|
| `src/app/(admin)/admin/complaints/chains/page.tsx` | 99, 114 | `/admin/complaints` | `/admin/cases` | Fixed |
| `src/app/(admin)/admin/passes/page.tsx` | 166 | `/admin/institutional/cases` | `/admin/cases` | Fixed |
| `src/app/(approver)/principal/_shared/entityInspectionModels.tsx` | 471 | `/principal/incidents` | `/principal/operations/incidents` | Fixed |
| `src/app/(approver)/principal/_shared/entityInspectionModels.tsx` | 764 | `/principal/audit` | `/principal/governance/audit` | Fixed |
| `src/components/shared/entityResolvers.tsx` | 758, 761 | `/principal/delegations` | `/principal/governance/delegations` | Fixed |
| `src/components/shared/entityResolvers.tsx` | 785, 788 | `/approver` | `/principal/people/departments` | Fixed |
| `src/components/shared/entityResolvers.tsx` | 1118, 1121, 1150, 1153 | `/approver/exam/permissions` | `/exam/permissions` | Fixed |

## 2. Broken CSS Class Typos Fixed (9 → 0 remaining)

Fixed `bgtext-muted` → `bg-text-muted` across:
- `src/app/(approver)/hod/_retention/BetweenClasses.tsx:121`
- `src/app/(approver)/vice-principal/_shared/UrgencyDot.tsx:17`
- `src/app/(sysadmin)/sysadmin/roles/page.tsx:485`
- `src/components/admin/sms/SmsQueue.tsx:32`
- `src/components/approver/MessInchargeStatusBar.tsx:81`
- `src/components/approver/RoleDashboardPanel.tsx:128-129`
- `src/components/engagement/DashboardCustomizer.tsx:321`
- `src/components/person/EmployeeStats.tsx:57`
- `src/components/admin/StatCard.tsx:49` (removed broken `sm: hover: hover:` classes)

## 3. UI Stubs Replaced (2)

- `src/app/(admin)/admin/settings/page.tsx`: Replaced `"More dynamic config forms coming soon…"` with a 6-card **Configuration Directory** linking to `/admin/institutional-configuration`, `/admin/permission-policies`, `/admin/workflow-configuration`, `/admin/roles`, `/admin/gate-device-configuration`, and `/admin/notification-settings`.
- `src/components/approver/RoleDashboardPanel.tsx`: Replaced `"KPI panel coming soon"` with an accurate empty state directing users to active queues/registers.

## 4. Read-Only KPI Cards Converted to Drill-Down Controls (21 cards)

- `src/components/principal/_components/StatCard.tsx`: Added optional `href?: string` prop with `<Link>` + `ChevronRight` + `focus-visible` ring.
- `src/app/(approver)/hod/_shared/ReportsView.tsx`: 4 KPI cards → `/hod/students`.
- `src/app/(approver)/hod/_shared/FacultyAttendanceView.tsx`: 3 KPI cards → `/hod/faculty/directory`.
- `src/app/(approver)/hod/_shared/StudentDirectoryView.tsx`: 3 KPI cards → `/hod/reports`.
- `src/app/(approver)/principal/_shared/AnalyticsView.tsx`: 3 KPI cards → `/principal/approvals`, `/principal/approvals/pending`, `/principal/approvals/overdue`.
- `src/app/(approver)/principal/_shared/HostelView.tsx`: 3 KPI cards → `openInspector(blocks[0])` / `/principal/people/attendance`.
- `src/app/(approver)/deputy-warden/daily-overview/page.tsx`: 4 `StatCard`s → `/deputy-warden/gate-movement`, `/deputy-warden/leave-requests`, `/deputy-warden/delegated-approvals`.
- `src/app/(approver)/guardian/page.tsx`: 4 `StatCard`s → `/guardian/child`, `/guardian/child-status`, `/guardian/child-requests`, `/guardian/passes`.
- `src/app/(approver)/exam/permissions/_panel.tsx`: 4 `StatCard`s → `/exam/permissions/oie`, `/exam/permissions/vice-principal`.
