# DOCUMENTATION_GAP_REGISTER

**Generated:** 2026-11-24
**Phase:** D — GAP ANALYSIS

## Documentation Defects

| ID | Doc Path | Problem | Evidence | Consequence | Severity | Recommended Correction | Confidence |
|---|---|---|---|---|---|---|---|
| G-001 | `oie/ROLE_REPORT.md` | **CONTRADICTORY_INFORMATION**: Initial "OIE has zero write paths" contradicted by `OieCommandBar.tsx` discovery | `OieCommandBar.tsx` exists at `src/components/approver/OieCommandBar.tsx`, wired into `RoleConsole.tsx:1195` and `useRoleConsoleChrome.ts:63`. PATCH at line 266. | OIE findings over-stated severity (P1→P2). | MEDIUM | **APPLIED.** OIE ROLE_REPORT corrected. Findings downgraded. | HIGH |
| G-002 | `CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md` §1.1 | **INCORRECT_INFORMATION**: States "Read-only in OIE" | `OieCommandBar.tsx` provides OIE write path via `RoleConsole` | Cross-role doc contradicts corrected OIE report | MEDIUM | Update §1.1 to: "OIE is read-only in kanban queue; actionable via `OieCommandBar` in `RoleConsole`" | HIGH |
| G-003 | `CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md` §4 | **INCORRECT_INFORMATION**: "HOD can act via detail panel; OIE cannot act at all" | OIE CAN act via `OieCommandBar` in `RoleConsole` | Cross-role inconsistency table is wrong | MEDIUM | Update row: "OIE kanban is read-only; OIE has command bar in RoleConsole" | HIGH |
| G-004 | `CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md` §5 | **INCORRECT_INFORMATION**: "No OIE action UI" | `OieCommandBar` IS an OIE action UI | Information gaps table is wrong | MEDIUM | Update: "OIE action UI exists (RoleConsole) but is not inlined in kanban queue" | HIGH |
| G-005 | `PRODUCT_CAPABILITIES.md` C-004 | **INCORRECT_INFORMATION**: "OIE VIEW ONLY — no action buttons" | `OieCommandBar` provides APPROVE/REJECT | Capability register understates OIE capability | MEDIUM | Update C-004: "OIE kanban is view-only; OIE has command bar in RoleConsole" | HIGH |
| G-006 | `FINAL_REPORT` §1 (Exec Summary) | **PARTIALLY CORRECTED**: OIE correction applied but role count was "24" | 28 role keys in `roles.ts` | Exec summary was 24-role | LOW | **APPLIED.** Now says "28-role" | HIGH |
| G-007 | `ROLE_INTELLIGENCE/ROLES/sysadmin/ROLE_REPORT.md` | **UNVERIFIED**: Not re-verified in this session | 76 pages, 5 writes, 4 findings (F-SA-01 through F-SA-04) | Cannot confirm accuracy | MEDIUM | Verify page count, `alert()` line 150, academic-status/pending orphan | MEDIUM |
| G-008 | `ROLE_INTELLIGENCE/ROLES/mess_incharge/ROLE_REPORT.md` | **UNVERIFIED** | 12 pages, 3 writes, 2 findings | Cannot confirm accuracy | LOW | Verify page count, write paths | MEDIUM |
| G-009 | `ROLE_INTELLIGENCE/ROLES/principal/ROLE_REPORT.md` | **UNVERIFIED** | 27 pages, 1 write (direct-generate), 2 findings | Cannot confirm accuracy | LOW | Verify page count, direct-generate line 67 | MEDIUM |
| G-010 | `ROLE_INTELLIGENCE/ROLES/ROLE_REPORT.md` (consolidated) | **UNVERIFIED** | 10 roles, 8 findings | Cannot confirm accuracy | MEDIUM | Spot-check caretaker, faculty, entity-aligned sections | MEDIUM |
| G-011 | V4.5 Dimension 11 (Accessibility) | **MISSING_AUDIT_DIMENSION**: No a11y test results | No axe-core, no Lighthouse a11y, no keyboard nav tests | Dimension not covered | HIGH | Add a11y test plan + results (or document as out-of-scope) | HIGH |
| G-012 | V4.5 Dimension 12 (Responsive UX) | **MISSING_AUDIT_DIMENSION**: No device emulation | No Lighthouse mobile, no tablet layout tests | Dimension not covered | HIGH | Add responsive test plan + results | HIGH |
| G-013 | V4.5 Dimension 13 (Performance as UX) | **MISSING_AUDIT_DIMENSION**: No performance measurements | No Lighthouse perf, no TTI/LCP/INP | Dimension not covered | HIGH | Add performance test plan + results | HIGH |
| G-014 | V4.5 Dimension 22 (Task simulations) | **INCOMPLETE_ANALYSIS**: 14 of 22 roles have "deferred" simulations | admin, sysadmin, mess, principal, caretaker, exam, faculty, staff, visitor, worker, deputy_warden, hostel_manager, emo, entity-aligned | Simulations not complete | MEDIUM | Add simulation scenarios for remaining 14 roles | MEDIUM |
| G-015 | `EVIDENCE/` directory | **MISSING_DOCUMENT**: Empty | 0 files | No raw evidence captures | LOW | Add evidence files or remove directory | LOW |
| G-016 | `FINDINGS/` directory | **MISSING_DOCUMENT**: Empty | 0 files | No finding index | LOW | Create FINDINGS_INDEX.md or remove directory | LOW |
| G-017 | `SIMULATIONS/SCENARIOS/` | **MISSING_DOCUMENT**: Empty | 0 files | No simulation files | MEDIUM | Create scenario files for 7 completed roles | MEDIUM |
| G-018 | `WORKFLOW_FORENSICS/WORKFLOWS/` | **MISSING_DOCUMENT**: Empty | 0 files | No workflow maps | MEDIUM | Create workflow map files | MEDIUM |
| G-019 | `CAPABILITY_FORENSICS/` | **MISSING_DOCUMENT**: Empty | 0 files | No capability audit | LOW | Create capability audit or remove directory | LOW |
| G-020 | `INTERACTION_FORENSICS/` | **MISSING_DOCUMENT**: Empty | 0 files | No interaction findings | LOW | Create interaction findings or remove directory | LOW |
| G-021 | `SUMMARIES/` | **MISSING_DOCUMENT**: Empty | 0 files | No domain summaries | LOW | Create summaries or remove directory | LOW |
| G-022 | `PAGE_FORENSICS/PAGES/` | **MISSING_DOCUMENT**: Empty | 0 files | No page-level forensics | LOW | Create page forensics or remove directory | LOW |
| G-023 | `ROLE_INTELLIGENCE/ROLES/{caretaker,deputy_warden,emo,exam_branch,exam_superintendent,faculty,hostel_manager,staff,visitor,worker}/` | **MISSING_DOCUMENT**: 10 empty role dirs | 0 files in each | Role profiles not individually retrievable | MEDIUM | Create ROLE_REPORT.md in each dir (or note in ROLE_INDEX that they're consolidated) | MEDIUM |
| G-024 | `MASTER_STATE.md` | **OUTDATED_INFORMATION**: "Current Phase: All phases complete" but 14 tasks marked NOT GENERATED | 13 files in GLOBAL_TASK_QUEUE marked NOT GENERATED | Master state says complete but tasks are missing | LOW | Clarify: "All phases complete; 13 planned files intentionally folded" | LOW |
| G-025 | `ROLE_INDEX.md` | **MISSING_EVIDENCE**: 3 AUTH-ONLY roles (dean, chief_warden, controller_*) have no evidence file | No `ROLES/dean/` dir, no `ROLES/chief_warden/` dir | Cannot verify auth-only status from docs alone | LOW | Add evidence: "No route group, no config file, not in ALL_ROLES, falls through to /login" | HIGH |

## Summary

| Category | Count |
|---|---|
| CONTRADICTORY_INFORMATION | 4 (G-002 through G-004, G-005) |
| INCORRECT_INFORMATION | 1 (G-001, resolved) |
| OUTDATED_INFORMATION | 1 (G-024) |
| MISSING_DOCUMENT | 8 (G-015 through G-023) |
| MISSING_AUDIT_DIMENSION | 3 (G-011, G-012, G-013) |
| INCOMPLETE_ANALYSIS | 1 (G-014) |
| UNVERIFIED | 4 (G-007 through G-010) |
| MISSING_EVIDENCE | 1 (G-025) |
| DUPLICATE_CONTENT | 0 |
| BROKEN_REFERENCE | 0 |
| WEAK_ROLE_INTELLIGENCE | 0 |
| POOR_TASK_DECOMPOSITION | 0 |
| POOR_INFORMATION_ARCHITECTURE | 0 |
| **TOTAL GAPS** | **25** |
