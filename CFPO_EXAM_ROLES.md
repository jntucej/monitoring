# CFPO Console-Shell Role Migrations — Batch: OIE, Exam Branch, Exam Superintendent

Stored spec for the three exam-domain roles to migrate onto the shared RoleConsole
shell. All reuse the existing shell (RoleConsole, KanbanBoard, GridBoard,
PermissionDetailPanel, SlaBadge). Each role = one PR-ish unit: append one
`consoles.ts` entry, mount RoleConsole in the layout, strip KPI/charts from the
root page, add a role-specific StatusBar/CommandBar + one extraPanel, trim
`useNavigation` to 5 console items, enforce scope. No horizontal scroll, no KPI
cards / charts on the root.

Pattern reference (already shipped, mirror these):
- HOD / class_teacher / deputy_warden  → kanban:permissions
- caretaker                             → grid:facilities
- hostel_manager                        → kanban:tickets + AllocationPanel
- staff                                 → feed:my-day + StaffStatusBar

Shared files (coordinate — one role at a time to avoid clobbering):
- `src/config/consoles.ts`
- `src/components/shared/RoleConsole.tsx`
- `src/hooks/useNavigation.ts`
- `src/components/shared/KanbanBoard.tsx` (already reads nested itemKey arrays)

---

## ROLE 1: oie (Officer In Charge of Examinations)

- ROUTE GROUP: `(approver)` · WORK URL PREFIX: `/oie`
- BOARD: kanban:exam-queue (`workflow_type=exam`)
- CONTEXT ENTITY: permission
- COMMANDS: approve, reject, forward, day-access, exceptions
- STATUS LINE: `queue, pending, exceptions, examDay`
- GOAL: exam-permission workflow + candidate attendance + access exceptions.
  Scope = exam workflows only (no hostel, no department).

### Wire
1. `consoles.ts` append:
   ```ts
   oie: {
     role: "oie",
     nav: ["queue", "candidates", "access", "exceptions", "records"],
     statusStrip: false,
     recentSheet: false,
     board: {
       kind: "kanban",
       source: "/api/oie/queue",
       itemKey: "permission",   // /api/oie/queue returns flat data:rows
       columns: ["PENDING", "ESCALATED", "APPROVED"],
     },
     contextEntity: "permission",
     commands: ["approve", "reject", "forward", "day-access", "exceptions"],
     statusFields: ["queue", "pending", "exceptions", "examDay"],
     extraPanels: ["ExamDayPanel"],
   }
   ```
2. `(approver)/oie/layout.tsx` — mount `<RoleConsole role="oie" roleRoot="/oie">`,
   delete the local tab bar / scroll row.
3. `(approver)/oie/page.tsx` — Board-only; strip KPI cards / charts / tab scroll.
   Kanban reads `/api/oie/queue`. Card: ticket_number, candidate_name,
   workflow_type, SLA badge, current_stage. extraPanel = ExamDayPanel.
4. `src/components/approver/ExamDayPanel.tsx` (NEW) — read `/api/exam/access`;
   list today's exam sessions (time, subject, hall, candidate count, access
   state). Actions: "Open day access" / "Close day access" → POST
   `/api/exam/access`. Desktop side panel; mobile full-width; no h-scroll.
5. Sub-pages (approvals, candidate-attendance, decision-history,
   exam-branch-coordination, examination-day-access, examination-overview,
   examination-pass-requests, examination-reports, incidents, logs,
   pending-approvals, records, tasks) reachable via IconRail flyout +
   CommandBar only — remove from any top scroll.
6. `useNavigation.ts` — `getDefaultNavigation("oie")` returns exactly 5 items,
   no Account:
   - `/oie` → "Exam Queue" (CheckSquare, PENDING)
   - `/oie/candidate-attendance` → "Candidates" (Users)
   - `/oie/examination-day-access` → "Access" (DoorOpen)
   - `/oie/access-exceptions` → "Exceptions" (ShieldAlert)
   - `/oie/records` → "Records" (FileSpreadsheet)
   - add `oie` to the console early-return block.

### Commands
- `> approve <ticket>` → PATCH `/api/permissions/[ticket]` `{ action: "APPROVE" }`
- `> reject <ticket> [reason]` → PATCH `/api/permissions/[ticket]` `{ action: "REJECT", comment }`
- `> forward <ticket> to <role>` → PATCH/POST `/api/permissions/[ticket]/forward`
- `> day-access open` → POST `/api/exam/access`
- `> exceptions` → focus `/oie/access-exceptions`

### Status bar
`● Exam queue · N pending · M exceptions · exam day: open/closed` — read from
`/api/oie/queue` + `/api/exam/access`.

### Accept
- sidebar = exactly 5 items; no h-scroll; root = Kanban + ExamDayPanel +
  StatusBar; commands approve/reject/forward/day-access work; scope = exam
  workflow only; no regression in candidate attendance / access flow.

---

## ROLE 2: exam_branch

- ROUTE GROUP: exam-branch · WORK URL PREFIX: `/exam-branch`
- BOARD: kanban:exam-queue (same kind as OIE, different stage)
- CONTEXT ENTITY: permission
- COMMANDS: verify, forward, oie-handoff, records, discrepancies
- STATUS LINE: `branch, pending, handoff, discrepancies`
- GOAL: verify + forward exam passes for the caller's own branch only.
  Scope = `permissions.branch` must equal the caller's branch.

### Wire
1. `consoles.ts` append:
   ```ts
   exam_branch: {
     role: "exam_branch",
     nav: ["queue", "oie-handoff", "discrepancies", "records", "reports"],
     statusStrip: false,
     recentSheet: false,
     board: {
       kind: "kanban",
       source: "/api/permissions?workflow_type=exam&branch=:self",
       itemKey: "permission",
       columns: ["PENDING", "FORWARDED", "APPROVED"],
     },
     contextEntity: "permission",
     commands: ["verify", "forward", "oie-handoff", "records", "discrepancies"],
     statusFields: ["branch", "pending", "handoff", "discrepancies"],
     extraPanels: ["HandoffPanel"],
   }
   ```
   - `:self` is resolved server-side from the caller's `employee_details.branch`
     or `department_id`.
2. `exam-branch/layout.tsx` — mount `<RoleConsole role="exam_branch" roleRoot="/exam-branch">`,
   delete the local tab bar.
3. `exam-branch/page.tsx` — Board-only; strip KPI/charts. Kanban reads
   `/api/permissions?workflow_type=exam&branch=<self>`. Card: ticket_number,
   candidate_name, current_stage, branch, SLA. extraPanel = HandoffPanel.
4. `src/components/approver/HandoffPanel.tsx` (NEW) — list tickets flagged for
   OIE handoff (`stage = "exam_branch_forwarded"`). Each row: candidate, roll,
   exam date, subject, status. Action "Send to OIE" → PATCH
   `/api/permissions/[ticket]` `{ action: "forward", targetRole: "oie" }`.
   Read from `/api/permissions?workflow_type=exam&branch=<self>&stage=forwarded`.
5. Sub-pages (calendar, discrepancies, docs, oie-approval-requests, oie-handoff,
   pass-queue, records, reports, verification) via IconRail flyout + CommandBar.
6. `useNavigation.ts` — `getDefaultNavigation("exam_branch")` returns 5 items,
   no Account:
   - `/exam-branch/pass-queue` → "Pass Queue" (ClipboardList)
   - `/exam-branch/oie-handoff` → "OIE Handoff" (ArrowLeftRight / Repeat)
   - `/exam-branch/discrepancies` → "Discrepancies" (ShieldAlert)
   - `/exam-branch/records` → "Records" (FileSpreadsheet)
   - `/exam-branch/reports` → "Reports" (BarChart3)
   - add `exam_branch` to the console early-return block.

### Commands
- `> verify <ticket>` → PATCH `/api/permissions/[ticket]` `action=verify`
- `> forward <ticket> to oie` → PATCH `/api/permissions/[ticket]/forward`
- `> handoff list` → focus `/exam-branch/oie-handoff`
- `> discrepancies` → focus `/exam-branch/discrepancies`
- `> records` → focus `/exam-branch/records`

### Status bar
`● <Branch> · N pending · M handoff · K discrepancies` — read from
`/api/permissions?workflow_type=exam&branch=<self>`.

### Accept
- sidebar = exactly 5 items; no h-scroll; root = Kanban + HandoffPanel +
  StatusBar; commands verify/forward/handoff work; scope = own branch exam
  workflow only; no regression in OIE handoff / discrepancy reporting.

---

## ROLE 3: exam_superintendent

- ROUTE GROUP: exam/superintendent · WORK URL PREFIX: `/exam/superintendent`
- BOARD: kanban:access (exam-day access, not workflow)
- CONTEXT ENTITY: permission
- COMMANDS: approve, reject, day-access, incident, candidates
- STATUS LINE: `examDay, halls, incidents, candidates`
- GOAL: control exam-day access, schedule, and incidents. Scope = current exam
  day only. Reads/writes `/api/exam/access` + `/api/exam/access-exceptions`.

### Wire
1. `consoles.ts` append:
   ```ts
   exam_superintendent: {
     role: "exam_superintendent",
     nav: ["access", "schedule", "incidents", "reports", "candidates"],
     statusStrip: false,
     recentSheet: false,
     board: {
       kind: "kanban",
       source: "/api/exam/access",
       itemKey: "permission",
       columns: ["PENDING", "ACTIVE", "CLOSED"],
     },
     contextEntity: "permission",
     commands: ["approve", "reject", "day-access", "incident", "candidates"],
     statusFields: ["examDay", "halls", "incidents", "candidates"],
     extraPanels: ["IncidentPanel"],
   }
   ```
2. `exam/superintendent/layout.tsx` — mount
   `<RoleConsole role="exam_superintendent" roleRoot="/exam/superintendent">`,
   delete the local tab bar.
3. `exam/superintendent/page.tsx` — Board-only; strip KPI/charts. Kanban reads
   `/api/exam/access`. Card: ticket_number, candidate_name, hall,
   exam_session, access_state, SLA. extraPanel = IncidentPanel.
4. `src/components/approver/IncidentPanel.tsx` (NEW) — read
   `/api/exam/access-exceptions`; list today's incidents
   `{ id, severity, candidate, hall, description, time }`. Severity icons:
   critical / warning / info. Action "Mark resolved" → PATCH
   `/api/exam/access-exceptions/[id]` (add the `[id]` route if missing).
   Unresolved first; red border for critical.
5. Sub-pages (access, incidents, reports, schedule) via IconRail flyout +
   CommandBar.
6. `useNavigation.ts` — `getDefaultNavigation("exam_superintendent")` returns
   5 items, no Account:
   - `/exam/superintendent/access` → "Access" (DoorOpen)
   - `/exam/superintendent/schedule` → "Schedule" (CalendarClock)
   - `/exam/superintendent/incidents` → "Incidents" (ShieldAlert)
   - `/exam/superintendent/reports` → "Reports" (FileSpreadsheet)
   - `/exam/superintendent/access` → "Candidates" (Users)
   - add `exam_superintendent` to the console early-return block.

### Commands
- `> approve <ticket>` → PATCH `/api/permissions/[ticket]` `{ action: "APPROVE" }`
- `> reject <ticket> [reason]` → PATCH `/api/permissions/[ticket]` `{ action: "REJECT", comment }`
- `> day-access open|close` → POST `/api/exam/access`
- `> incident <hall> <severity>` → POST `/api/exam/access-exceptions`
- `> candidates` → focus `/exam/superintendent/access`

### Status bar
`● Exam day: active · N halls open · M incidents · K candidates` — read from
`/api/exam/access` + `/api/exam/access-exceptions`.

### Accept
- sidebar = exactly 5 items; no h-scroll; root = Kanban + IncidentPanel +
  StatusBar; commands approve/reject/day-access/incident work; scope = current
  exam day only; no regression in candidate attendance / access flow.

---

## Execution order (one at a time, shared-file-safe)
1. **oie** (agent: nautilus) → gate (tsc / build / 92-0 / no use-client) → deploy
2. **exam_branch** → gate → deploy
3. **exam_superintendent** → gate → deploy

Verify each API route's exact request/response shape before wiring (the
board `itemKey` + command bodies must match the real routes). `/api/oie/queue`
returns a **flat** `data: rows` array (not nested) — use the KanbanBoard flat
path. Confirm `/api/exam/access` POST body + `/api/exam/access-exceptions`
POST/PATCH shapes on disk.
