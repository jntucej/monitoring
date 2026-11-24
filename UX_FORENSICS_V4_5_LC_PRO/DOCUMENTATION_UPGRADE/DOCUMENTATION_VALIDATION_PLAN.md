# DOCUMENTATION_VALIDATION_PLAN

**Generated:** 2026-11-24
**Phase:** E — PROPOSE UPGRADES
**Purpose:** How each proposed modification will be verified after implementation.

## Validation Methods

| Upgrade | Validation Method |
|---|---|
| U001 (PERMISSION_INCONSISTENCIES OIE fix) | Grep for "Read-only in OIE" — should return 0 matches. Grep for "OieCommandBar" — should appear in §1.1, §4, §5. |
| U002 (PRODUCT_CAPABILITIES C-004 fix) | Grep for "VIEW ONLY" in C-004 row — should return 0 matches. Grep for "OieCommandBar" in C-004 row — should appear. |
| U003 (sysadmin ROLE_REPORT verification) | Grep for "Verification Log" in sysadmin ROLE_REPORT — should appear. Confirm 76 page count matches `find` result. |
| U004 (mess_incharge verification) | Grep for "Verification Log" in mess ROLE_REPORT — should appear. Confirm 12 page count. |
| U005 (principal verification) | Grep for "Verification Log" in principal ROLE_REPORT — should appear. Confirm 27 page count. |
| U006 (consolidated ROLE_REPORT verification) | Grep for "Verification Log" in consolidated ROLE_REPORT — should appear. |
| U007 (FINDINGS_INDEX.md) | File exists at `FINDINGS/FINDINGS_INDEX.md`. Contains all F-* finding IDs from all ROLE_REPORTs. |
| U008 (SIMULATION_SCENARIOS.md) | File exists at `SIMULATIONS/SCENARIOS/SIMULATION_SCENARIOS.md`. Contains scenarios for 7 completed roles. |
| U009 (WORKFLOW_MAPS.md) | File exists at `WORKFLOW_FORENSICS/WORKFLOWS/WORKFLOW_MAPS.md`. Contains 6 workflow maps. |
| U010 (A11Y_RESP_PERF_PLAN.md) | File exists at `EVIDENCE/ACCESSIBILITY_RESPONSIVE_PERFORMANCE_PLAN.md`. Marks dimensions 11/12/13 as NOT PERFORMED. |
| U011 (ROLE_INDEX evidence) | Grep for "ALL_ROLES" in ROLE_INDEX — should appear in verification section. |
| U012 (10 role ROLE_REPORTs) | 10 new files exist. Each references the consolidated report. |
| U013 (MASTER_STATE clarification) | Grep for "folded" in MASTER_STATE — should appear. |

## Post-Validation Checks
1. All 30 original .md files still exist (no deletions).
2. All 14 new files created successfully.
3. No application source files modified (`git status` shows only `UX_FORENSICS_V4_5_LC_PRO/` changes).
4. Cross-references resolve (no broken links between docs).
5. OIE correction is consistent across all 6 docs that mention OIE.
