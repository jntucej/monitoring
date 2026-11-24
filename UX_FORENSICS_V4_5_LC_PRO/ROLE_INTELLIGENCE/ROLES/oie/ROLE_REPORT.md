# ROLE_REPORT — oie

**Role:** OIE / Exam Branch (`oie`, `exam_branch`, `exam_superintendent`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Overview
The OIE surface is a **12-page exam-access console**. The queue (`/oie/queue/pending`) is a **read-only kanban board** (`KanbanBoard` + `EntityInspector`). No PATCH/POST on any OIE page **in the OIE route group**.

**CORRECTION (2026-11-24):** `OieCommandBar.tsx` EXISTS at `src/components/approver/OieCommandBar.tsx` and is wired into `RoleConsole.tsx:1195` and `useRoleConsoleChrome.ts:63`. The OIE command bar calls `PATCH /api/permissions/[ticket]` with APPROVE/REJECT actions. The OIE kanban queue at `/oie/queue/pending` is read-only, but OIE also has a `RoleConsole` surface where the command bar IS actionable. The initial "OIE has zero write paths" finding was INCORRECT. The gap is: the kanban queue (the primary OIE surface) does not inline the command bar; OIE must navigate to the RoleConsole to act.

Contrast: the same `PATCH /api/permissions/[ticket]` endpoint that VP and HOD use (via detail panel) is **not called from any OIE kanban page**. However, the `OieCommandBar` in `RoleConsole` DOES call it.

## 2. Page Inventory (12 OIE + 10 exam-branch + 5 exam/superintendent = 27 pages)

### OIE (12 pages)
| Path | Type | Data | Write |
|---|---|---|---|
| `/oie` (home) | Dashboard | OIE dashboard | — |
| `/oie/queue` | Kanban | `GET /api/oie/queue` | — |
| `/oie/queue/pending` | **Kanban (read-only)** | `GET /api/oie/queue?status=PENDING` | **NONE** |
| `/oie/queue/escalated` | Kanban | `GET /api/oie/queue?status=ESCALATED` | — |
| `/oie/queue/history` | List | `GET /api/oie/queue?status=RESOLVED` | — |
| `/oie/candidate-attendance` | Read | `GET /api/exam/candidate-attendance` | — |
| `/oie/examination-day-access` | Read | `GET /api/permissions?workflow_type=exam&status=PENDING` | — |
| `/oie/access-exceptions` | Read | `GET /api/exam/access-exceptions` | — |
| `/oie/examination-reports` | Read | `GET /api/campus-extra/analytics?role=oie` | — |
| `/oie/decision-history` | List | past decisions | — |
| `/oie/exam-branch-coordination` | Read | coordination | — |
| `/oie/records` | List | records | — |

### Exam-Branch (10 pages, top-level)
All read-only: oie-handoff, discrepancies, verification, calendar, records, docs.

### Exam/Superintendent (5 pages, top-level)
All read-only: home, incidents, schedule, reports.

## 3. Write Paths
**One write path via `OieCommandBar` in `RoleConsole` (CORRECTED from "NONE").**
- `OieCommandBar.tsx` calls `PATCH /api/permissions/[ticket]` with APPROVE/REJECT actions (line 266).
- `OieCommandBar` is wired into `RoleConsole.tsx:1195` and `useRoleConsoleChrome.ts:63`.
- The OIE kanban queue (`/oie/queue/pending`) does NOT inline the command bar; it uses `KanbanBoard` + `EntityInspector` only.
- The `EntityInspector` on the kanban is **inspection-only** (no action buttons).

**Net:** OIE CAN act, but only from the `RoleConsole` surface, not from the primary kanban queue. This is a UX gap (the kanban should surface the command bar inline), not a capability gap.

## 4. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-OIE-01 | OIE kanban queue is read-only; `OieCommandBar` is wired in `RoleConsole` but not inlined in the kanban queue | MEDIUM (downgraded from HIGH) | P2 (downgraded from P1) | HIGH |
| F-OIE-02 | `EntityInspector` on kanban is inspection-only; no action buttons | MEDIUM (downgraded from HIGH) | P2 (downgraded from P1) | HIGH |
| F-OIE-03 | OIE has 12 pages in the OIE route group; 1 write path via `RoleConsole` command bar; exam-branch and exam-superintendent are read-only | LOW (downgraded from MEDIUM) | P3 (downgraded from P2) | HIGH |

## Verification Log (2026-11-24)
- 12 OIE pages: **CONFIRMED** (find count = 12)
- 10 exam-branch pages: **CONFIRMED**
- 5 exam/superintendent pages: **CONFIRMED**
- `OieCommandBar.tsx` at `src/components/approver/OieCommandBar.tsx`: **CONFIRMED** (PATCH at line 266)
- `OieCommandBar` wired into `RoleConsole.tsx:1195`: **CONFIRMED**
- `OieCommandBar` wired into `useRoleConsoleChrome.ts:63`: **CONFIRMED**
- 3 findings reclassified: F-OIE-01 (P1→P2), F-OIE-02 (P1→P2), F-OIE-03 (P2→P3)

## 5. Task Simulation
### Routine: Check exam-day access
1. OIE at `/oie/queue/pending` → kanban shows PENDING exam-access tickets.
2. Taps a card → `EntityInspector` opens with ticket details.
3. **No action button on the kanban.** OIE must navigate to `RoleConsole` to use `OieCommandBar`.
**Friction:** The kanban queue (primary surface) does not inline the command bar. OIE must know to switch to the RoleConsole to act. This is a discoverability gap, not a capability gap.

## 6. Coverage Statement
| Dimension | Status |
|---|---|
| Role understanding | COMPLETE |
| Page coverage | COMPLETE (27/27) |
| Workflow coverage | PARTIAL (view-only; no action) |
| Interaction coverage | COMPLETE |
| State coverage | COMPLETE |
| Accessibility | PARTIAL |
| Performance | NOT MEASURED |
| Task simulation | COMPLETE |

**Note (CORRECTED):** OIE is NOT a zero-write role. `OieCommandBar` in `RoleConsole` provides APPROVE/REJECT via `PATCH /api/permissions/[ticket]`. The gap is that the primary kanban queue does not surface the command bar inline, forcing OIE to navigate to a separate surface to act. Downgraded from P1 to P2.
