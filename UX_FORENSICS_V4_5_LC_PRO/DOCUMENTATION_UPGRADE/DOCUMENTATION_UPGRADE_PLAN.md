# DOCUMENTATION_UPGRADE_PLAN

**Generated:** 2026-11-24
**Phase:** E — PROPOSE UPGRADES
**Status:** PENDING APPROVAL

## Proposed Upgrades

### U001 — Correct OIE in CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md
- **Target:** `CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md`
- **Gaps:** G-002, G-003, G-004
- **Current:** §1.1 says "Read-only in OIE". §4 says "OIE cannot act at all". §5 says "No OIE action UI".
- **Proposed:** Update §1.1: "OIE is read-only in kanban queue; actionable via `OieCommandBar` in `RoleConsole` (PATCH at line 266)". Update §4: "OIE kanban is read-only; OIE has command bar in RoleConsole — not inlined in kanban". Update §5: "OIE action UI exists in RoleConsole but is not discoverable from kanban queue".
- **Reason:** `OieCommandBar.tsx` EXISTS and is wired. Initial "OIE has zero write paths" was incorrect.
- **Evidence:** `src/components/approver/OieCommandBar.tsx:266`, `src/components/shared/RoleConsole.tsx:1195`, `src/hooks/useRoleConsoleChrome.ts:63`
- **Preserve:** All other sections unchanged.
- **Priority:** HIGH
- **New file:** No
- **Risk:** LOW

### U002 — Correct OIE in PRODUCT_CAPABILITIES.md
- **Target:** `PRODUCT_INTELLIGENCE/PRODUCT_CAPABILITIES.md`
- **Gaps:** G-005
- **Current:** C-004 says "OIE VIEW ONLY — no action buttons"
- **Proposed:** Update C-004: "OIE kanban is view-only; OIE has command bar in RoleConsole (OieCommandBar.tsx:266). The gap is discoverability, not capability."
- **Reason:** Same OIE correction.
- **Preserve:** All other capabilities unchanged.
- **Priority:** HIGH
- **New file:** No
- **Risk:** LOW

### U003 — Verify sysadmin ROLE_REPORT
- **Target:** `ROLE_INTELLIGENCE/ROLES/sysadmin/ROLE_REPORT.md`
- **Gaps:** G-007
- **Current:** UNVERIFIED
- **Proposed:** Add Verification Log confirming 76 pages, `alert()` at line 150, `academic-status/pending` orphan.
- **Priority:** MEDIUM
- **New file:** No
- **Risk:** LOW

### U004 — Verify mess_incharge ROLE_REPORT
- **Target:** `ROLE_INTELLIGENCE/ROLES/mess_incharge/ROLE_REPORT.md`
- **Gaps:** G-008
- **Current:** UNVERIFIED
- **Proposed:** Add Verification Log confirming 12 pages, 3 write paths.
- **Priority:** LOW
- **New file:** No
- **Risk:** LOW

### U005 — Verify principal ROLE_REPORT
- **Target:** `ROLE_INTELLIGENCE/ROLES/principal/ROLE_REPORT.md`
- **Gaps:** G-009
- **Current:** UNVERIFIED
- **Proposed:** Add Verification Log confirming 27 pages, direct-generate at line 67.
- **Priority:** LOW
- **New file:** No
- **Risk:** LOW

### U006 — Verify consolidated ROLE_REPORT
- **Target:** `ROLE_INTELLIGENCE/ROLES/ROLE_REPORT.md`
- **Gaps:** G-010
- **Current:** UNVERIFIED
- **Proposed:** Add Verification Log spot-checking caretaker, faculty, entity-aligned sections.
- **Priority:** MEDIUM
- **New file:** No
- **Risk:** LOW

### U007 — Create FINDINGS_INDEX.md
- **Target:** `FINDINGS/FINDINGS_INDEX.md`
- **Gaps:** G-016
- **Current:** `FINDINGS/` is empty
- **Proposed:** Create index of all findings (F-OP-01 through F-EA-02) with severity, priority, status.
- **Priority:** MEDIUM
- **New file:** Yes
- **Risk:** LOW

### U008 — Create SIMULATION_SCENARIOS.md
- **Target:** `SIMULATIONS/SCENARIOS/SIMULATION_SCENARIOS.md`
- **Gaps:** G-017, G-014
- **Current:** `SIMULATIONS/SCENARIOS/` is empty
- **Proposed:** Create simulation scenarios for 7 completed roles (operator, student, HOD, VP, OIE, guardian, supervisor) + note 14 deferred.
- **Priority:** MEDIUM
- **New file:** Yes
- **Risk:** LOW

### U009 — Create WORKFLOW_MAPS.md
- **Target:** `WORKFLOW_FORENSICS/WORKFLOWS/WORKFLOW_MAPS.md`
- **Gaps:** G-018
- **Current:** `WORKFLOW_FORENSICS/WORKFLOWS/` is empty
- **Proposed:** Create 6 workflow maps (pass lifecycle, gate operation, complaint, mess, exam, lockdown) with handoff points.
- **Priority:** MEDIUM
- **New file:** Yes
- **Risk:** LOW

### U010 — Create ACCESSIBILITY_RESPONSIVE_PERFORMANCE_PLAN.md
- **Target:** `EVIDENCE/ACCESSIBILITY_RESPONSIVE_PERFORMANCE_PLAN.md`
- **Gaps:** G-011, G-012, G-013
- **Current:** No a11y/responsive/performance test results
- **Proposed:** Create test plan documenting what would be tested, tools (axe-core, Lighthouse), pass criteria, and marking dimensions 11/12/13 as "NOT PERFORMED — OUT OF SCOPE FOR READ-ONLY AUDIT".
- **Priority:** HIGH
- **New file:** Yes
- **Risk:** LOW

### U011 — Add AUTH-ONLY ROLE EVIDENCE to ROLE_INDEX
- **Target:** `ROLE_INTELLIGENCE/ROLE_INDEX.md`
- **Gaps:** G-025
- **Current:** dean/chief_warden/controller_* marked AUTH-ONLY without evidence trail
- **Proposed:** Add evidence: "Not in `ALL_ROLES` (routes.ts), not in `getDefaultRouteForRole`, no config file in `src/config/roles/`, no route group in `src/app/`. Falls through to `/login`."
- **Priority:** LOW
- **New file:** No
- **Risk:** LOW

### U012 — Create ROLE_REPORTS for 10 Empty Role Dirs
- **Target:** `ROLE_INTELLIGENCE/ROLES/{caretaker,deputy_warden,emo,exam_branch,exam_superintendent,faculty,hostel_manager,staff,visitor,worker}/ROLE_REPORT.md`
- **Gaps:** G-023
- **Current:** 10 empty role directories
- **Proposed:** Create minimal ROLE_REPORT.md in each dir, referencing the consolidated `ROLE_REPORT.md` section + adding a Verification Log.
- **Priority:** MEDIUM
- **New file:** Yes (10 files)
- **Risk:** LOW

### U013 — Update MASTER_STATE with fold-in clarification
- **Target:** `MASTER/MASTER_STATE.md`
- **Gaps:** G-024
- **Current:** "All phases complete" but 13 planned files not generated
- **Proposed:** Add: "13 of 30 planned files intentionally folded into existing docs (see GLOBAL_TASK_QUEUE NOT GENERATED notes)."
- **Priority:** LOW
- **New file:** No
- **Risk:** LOW

## Upgrade Summary

| ID | Target | Gaps | Priority | New File? |
|---|---|---|---|---|
| U001 | PERMISSION_INCONSISTENCIES.md | G-002,003,004 | HIGH | No |
| U002 | PRODUCT_CAPABILITIES.md | G-005 | HIGH | No |
| U003 | sysadmin ROLE_REPORT | G-007 | MEDIUM | No |
| U004 | mess_incharge ROLE_REPORT | G-008 | LOW | No |
| U005 | principal ROLE_REPORT | G-009 | LOW | No |
| U006 | Consolidated ROLE_REPORT | G-010 | MEDIUM | No |
| U007 | FINDINGS/FINDINGS_INDEX.md | G-016 | MEDIUM | Yes |
| U008 | SIMULATIONS/SCENARIOS.md | G-014,017 | MEDIUM | Yes |
| U009 | WORKFLOW_FORENSICS/WORKFLOW_MAPS.md | G-018 | MEDIUM | Yes |
| U010 | EVIDENCE/A11Y_RESP_PERF_PLAN.md | G-011,012,013 | HIGH | Yes |
| U011 | ROLE_INDEX.md | G-025 | LOW | No |
| U012 | 10 role ROLE_REPORTs | G-023 | MEDIUM | Yes (10) |
| U013 | MASTER_STATE.md | G-024 | LOW | No |

**Total: 13 upgrades. 14 new files. 9 existing files updated.**
