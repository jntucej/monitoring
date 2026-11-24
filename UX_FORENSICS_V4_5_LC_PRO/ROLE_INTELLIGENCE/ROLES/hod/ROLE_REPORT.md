# ROLE_REPORT — hod (Head of Department)

**Role:** HOD (`hod`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED + OBSERVED

## 1. Role Overview
The HOD surface is a **12-page approver console** focused on pass approval, faculty oversight, and department reporting. The critical finding: the HOD approval queue is **read-only in the list view** but **becomes actionable via the DetailSheet → PermissionDetailPanel** (which has `PATCH /api/permissions/[ticket]` with APPROVE/REJECT/FORWARD/ESCALATE at line 363). So the HOD CAN act, but only after tapping a ticket to open the detail panel. The list itself has no inline action buttons.

## 2. Page Inventory (12 pages)

| Path | Type | Data | Write |
|---|---|---|---|
| `/hod` (home) | Dashboard | `GET /api/hod/dashboard` | — |
| `/hod/home` | Dashboard | `GET /api/hod/dashboard` | — |
| `/hod/approvals` | Redirect | → `/hod/approvals/pending` | — |
| `/hod/approvals/pending` | **List** | `GET /api/permissions?stage=hod&status=PENDING` (15s TTL) | **Via DetailSheet → `PATCH /api/permissions/[ticket]`** |
| `/hod/approvals/escalated` | **List** | `GET /api/permissions?stage=hod&status=ESCALATED` | **Via DetailSheet** |
| `/hod/faculty` | List | `GET /api/hod/faculty` | — |
| `/hod/faculty/attendance` | Read | `GET /api/faculty/attendance` | — |
| `/hod/faculty/directory` | List | `GET /api/hod/faculty` | — |
| `/hod/students` | List | `GET /api/students` | — |
| `/hod/classes` | Read | `GET /api/hod/schedule` | — |
| `/hod/reports` | Read | `GET /api/students/stats` | — |
| `/hod/profile` | Shell | profile | — |

## 3. Approval Flow (CODE_VERIFIED)
1. HOD opens `/hod/approvals/pending` → `ApprovalsView status="PENDING"`.
2. List renders tickets via `DataTable` (desktop) or card list (mobile).
3. Row click → `openStageDrawer(item)` → sets `stageItem` → `ApproverStageDrawer` opens.
4. Simultaneously: `DetailSheet` opens with `PermissionDetailPanel`.
5. `PermissionDetailPanel` (line 363): `PATCH /api/permissions/[ticket]` with `action: "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE"`.
6. On success: `refresh()` re-fetches the list.

**Key insight:** The HOD IS actionable — but only through the detail panel, not inline. The list view has no approve/reject buttons. This is a UX gap: an HOD scanning a queue of 30 tickets must open each one to act.

## 4. Interaction Quality
- **Strength:** `SlaBadge` shows SLA deadline per ticket.
- **Strength:** `WeekBar` provides temporal context.
- **Strength:** `ApproverStageDrawer` shows the full approval chain (student → faculty → hod → deputy_warden → hostel_manager → warden → principal).
- **Weakness:** No inline action buttons on the list. Must open detail panel per ticket.
- **Weakness:** No bulk action. 30 tickets = 30 detail-panel opens.
- **Weakness:** `useApiResource` with 15s TTL — data goes stale after 15 seconds.

## 5. State Coverage
| State | Present |
|---|---|
| Loading | YES (`ListSkeleton rows={6}`) |
| Empty | YES (`EmptyState "Nothing here"`) |
| Error | YES (`useApiResource` error state) |
| Success | YES (toast via `PermissionDetailPanel`) |
| Stale data | YES (15s TTL, `refresh()` on action) |

## 6. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-HOD-01 | No inline action buttons on approval list; must open detail panel per ticket | MEDIUM | P1 | HIGH |
| F-HOD-02 | No bulk approval for HOD (backend `POST /api/permissions/bulk` exists but is unwired) | MEDIUM | P1 | HIGH |
| F-HOD-03 | 15s TTL on approval queue — data goes stale if HOD is viewing for >15s | LOW | P3 | MEDIUM |

## Verification Log (2026-11-24)
- 12 HOD pages: **CONFIRMED** (find count = 12)
- `PermissionDetailPanel` at `src/components/approver/PermissionDetailPanel.tsx` line 363-364: **CONFIRMED** (PATCH call verified)
- `ApprovalsView` at `src/app/(approver)/hod/_shared/ApprovalsView.tsx`: **CONFIRMED** (3 separate files: hod, principal, vice-principal)
- `DetailSheet` imports `PermissionDetailPanel`: **CONFIRMED** (lines 3, 27, 39)
- 15s TTL on approval queue: **OBSERVED** (in `useApiResource` hook)
- 3 findings (F-HOD-01 through F-HOD-03): **CONFIRMED**
- **CORRECTION:** OIE is NOT purely read-only. `OieCommandBar.tsx` exists at `src/components/approver/OieCommandBar.tsx` and is wired into `RoleConsole.tsx:1195` and `useRoleConsoleChrome.ts:63`. OIE has a command bar that calls `PATCH /api/permissions/[ticket]`. The initial "OIE has zero write paths" finding was INCORRECT. The OIE kanban queue at `/oie/queue/pending` uses `KanbanBoard` + `EntityInspector` only (read-only), but OIE also has a `RoleConsole` surface with the `OieCommandBar` that IS actionable.

## 7. Task Simulation
### Routine: Approve a pass
1. HOD at `/hod/approvals/pending` → sees 5 tickets.
2. Taps ticket #1 → `DetailSheet` + `ApproverStageDrawer` open.
3. HOD reviews details → taps **APPROVE** in `PermissionDetailPanel`.
4. `PATCH /api/permissions/[ticket]` → success toast → list refreshes.
5. Repeat for tickets #2–#5.
**Friction:** 5 detail-panel opens for 5 approvals. No batch path.

### Exceptional: Escalate a ticket
1. HOD taps ticket → detail panel → taps **ESCALATE**.
2. `PATCH /api/permissions/[ticket]` with `action: "ESCALATE"`.
3. Ticket moves to next stage (deputy_warden / hostel_manager / principal).
**Friction:** None. The escalation path works.

## 8. Coverage Statement
| Dimension | Status |
|---|---|
| Role understanding | COMPLETE |
| Permission verification | COMPLETE (HOD can ACT via detail panel, not just view) |
| Page coverage | COMPLETE (12/12) |
| Workflow coverage | COMPLETE (approve, reject, escalate, forward) |
| Interaction coverage | COMPLETE |
| State coverage | COMPLETE |
| Accessibility | PARTIAL |
| Responsive | PARTIAL |
| Performance | NOT MEASURED |
| Task simulation | COMPLETE |

**Correction to V3 report:** The V3 report stated "HOD is read-only." This is **incorrect**. The HOD approval queue IS actionable via `PermissionDetailPanel` (`PATCH /api/permissions/[ticket]` at `src/components/approver/PermissionDetailPanel.tsx:363`). The UX gap is the lack of inline action buttons, not the lack of backend capability.

**Correction to OIE finding:** The initial audit stated "OIE has zero write paths." This is **partially incorrect**. `OieCommandBar.tsx` EXISTS at `src/components/approver/OieCommandBar.tsx` and is wired into `RoleConsole.tsx:1195` and `useRoleConsoleChrome.ts:63`. The OIE command bar calls `PATCH /api/permissions/[ticket]` with APPROVE/REJECT actions. The OIE kanban queue at `/oie/queue/pending` is read-only (KanbanBoard + EntityInspector only), but OIE also has a `RoleConsole` surface where the command bar IS actionable. The finding should be reclassified from P1-HIGH to P2-MEDIUM: "OIE kanban queue lacks inline actions; OIE must use the separate RoleConsole command bar to act."
