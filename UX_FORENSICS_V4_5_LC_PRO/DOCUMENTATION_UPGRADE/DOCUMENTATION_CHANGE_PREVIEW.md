# DOCUMENTATION_CHANGE_PREVIEW

**Generated:** 2026-11-24
**Phase:** E — PROPOSE UPGRADES
**Purpose:** Show intended modifications before execution.

## U001 — PERMISSION_INCONSISTENCIES.md

**BEFORE (§1.1):**
```
- **Read-only** in OIE (KanbanBoard + EntityInspector, no action)
- **Read-only** in supervisor (EscalationsView, comment: "the inspector never invents one")
```

**AFTER (§1.1):**
```
- **Read-only in kanban queue** in OIE (KanbanBoard + EntityInspector). **Actionable via `OieCommandBar` in `RoleConsole`** (PATCH at line 266).
- **Read-only** in supervisor (EscalationsView, comment: "the inspector never invents one")
```

**BEFORE (§4 table row):**
```
| HOD can act via detail panel; OIE cannot act at all | HOD vs OIE queue | OIE is stuck watching |
```

**AFTER (§4 table row):**
```
| HOD can act via detail panel; OIE kanban is read-only but OIE has command bar in RoleConsole | HOD vs OIE queue | OIE must navigate to RoleConsole to act; discoverability gap |
```

**BEFORE (§5 table row):**
```
| No OIE action UI | OIE, exam_branch, exam_superintendent | Exam access cannot be approved from OIE surface |
```

**AFTER (§5 table row):**
```
| OIE action UI exists in RoleConsole (OieCommandBar) but is not inlined in kanban queue | OIE, exam_branch, exam_superintendent | Exam access CAN be approved via RoleConsole; gap is discoverability from kanban |
```

## U002 — PRODUCT_CAPABILITIES.md

**BEFORE (C-004):**
```
| C-004 | Pass approval (OIE) | `KanbanBoard source="/api/oie/queue"` | `/oie/queue/pending` | `GET /api/oie/queue?status=PENDING` | oie, exam_branch | **VIEW ONLY** — no action buttons | Read-only in OIE | HIGH |
```

**AFTER (C-004):**
```
| C-004 | Pass approval (OIE) | `KanbanBoard source="/api/oie/queue"` + `OieCommandBar.tsx:266` | `/oie/queue/pending` + `RoleConsole` | `GET /api/oie/queue?status=PENDING` + `PATCH /api/permissions/[ticket]` (via OieCommandBar) | oie, exam_branch | **Kanban: VIEW ONLY. RoleConsole: ACTIONABLE via OieCommandBar** | Gap: command bar not inlined in kanban | HIGH |
```

## U010 — New: EVIDENCE/A11Y_RESP_PERF_PLAN.md

**BEFORE:** (file does not exist)

**AFTER:** New file with:
- Accessibility test plan (axe-core on top-20 pages, WCAG 2.1 AA)
- Responsive test plan (Lighthouse mobile/tablet emulation on /operator, /student, /guardian)
- Performance test plan (Lighthouse TTI/LCP/INP on /operator, /admin, /sysadmin)
- Status: **NOT PERFORMED — OUT OF SCOPE FOR READ-ONLY AUDIT**
- Recommendation: Run in CI or as separate QA pass

## U012 — New: 10 role ROLE_REPORTs

**BEFORE:** (empty directories)

**AFTER:** Each file:
```markdown
# ROLE_REPORT — {role}
**Role:** {role}
**Audit date:** 2026-11-24
**Status:** Consolidated in `ROLE_INTELLIGENCE/ROLES/ROLE_REPORT.md` §{role}
**Verification Log:** See consolidated report.
```

## U013 — MASTER_STATE.md

**BEFORE:**
```
All phases P0-P10 complete. Audit finished 2026-11-24.
```

**AFTER:**
```
All phases P0-P10 complete. Audit finished 2026-11-24.
13 of 30 planned task files intentionally folded into existing docs (see GLOBAL_TASK_QUEUE NOT GENERATED notes).
```

## Files NOT Changed
- All other PRODUCT_INTELLIGENCE docs (already verified in this session)
- operator, student, HOD, VP, OIE, guardian, supervisor ROLE_REPORTs (already verified)
- FINAL_REPORT/UX_PRODUCT_FORENSICS_V4_5.md (already updated with OIE correction)
