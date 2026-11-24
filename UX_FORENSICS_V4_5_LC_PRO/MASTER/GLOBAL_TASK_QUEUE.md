# GLOBAL_TASK_QUEUE

## P0 — Project Discovery
- [x] T001 PROJECT_MAP.md — repo structure, entry points, frameworks, routing, auth, DB, API, shared components, styling, testing, docs, workflows
- [x] T002 ROUTE_INDEX.md — all 441 pages grouped by route group, with access requirements
- [x] T003 COMPONENT_INDEX.md — layout, nav, forms, tables, cards, dialogs, shared patterns
- [x] T004 API_INDEX.md — all 669 API routes grouped by sub-tree
- [x] T005 DATA_MODEL.md — key entities, relationships, mutations
- [x] T006 NAVIGATION_MODEL.md — primary/secondary nav, breadcrumbs, role-specific nav, deep links, orphans
- [x] T007 DESIGN_SYSTEM.md — typography, color, spacing, layout, breakpoints, icons, button/input variants, status colors, motion, focus
- [x] T008 UNKNOWN_AREAS.md — what could not be verified

## P1 — Product Intelligence
- [x] T101 PRODUCT_MODEL.md
- [x] T102 PRODUCT_CAPABILITIES.md

## P2 — Role Discovery
- [x] T201 ROLE_INDEX.md — all roles from auth code + RBAC + nav guards
- [ ] T202 ROLE_COVERAGE.md — **NOT GENERATED** (coverage folded into ROLE_INDEX.md and final report §3)
- [ ] T203 ROLE_RELATIONSHIPS.md — **NOT GENERATED** (relationships folded into CROSS_ROLE_FORENSICS)

## P3 — Role Intelligence
- [x] T301..T3XX — one profile dir per role under ROLE_INTELLIGENCE/ROLES/

## P4 — Sequential Role Audits
- [x] T401 operator
- [x] T402 student
- [x] T403 hod
- [x] T404 vice_principal
- [x] T405 oie
- [x] T406 guardian
- [x] T407 admin
- [x] T408 sysadmin
- [x] T409 supervisor
- [x] T410 mess_incharge
- [x] T411 principal
- [x] T412 caretaker
- [x] T413 exam_branch / exam_superintendent
- [x] T414 faculty
- [x] T415 staff
- [x] T416 visitor
- [x] T417 worker
- [x] T418 deputy_warden
- [x] T419 hostel_manager
- [x] T420 emo
- [x] T421 entity-aligned (dean, chief_warden, controller_*, addl_controller_*)

## P5 — Task Simulation
- [x] T501 routine + exceptional simulations per role (folded into ROLE_REPORT.md files)

## P6 — Hidden Capability
- [x] T601 HIDDEN_CAPABILITIES.md — folded into ROLE_REPORT.md and CROSS_ROLE_FORENSICS
- [ ] T602 MISSING_CAPABILITIES.md — **NOT GENERATED** (folded into final report §5 Roadmap)

## P7 — Finding Management
- [ ] T701 FINDINGS_INDEX.md — **NOT GENERATED** (findings indexed in final report §4)
- [ ] T702 FINDINGS_BY_PRIORITY.md — **NOT GENERATED** (priorities in final report §4 P0-P3 sections)
- [ ] T703 DUPLICATES.md — **NOT GENERATED**
- [ ] T704 UNVERIFIED_FINDINGS.md — **NOT GENERATED** (unresolved questions in final report §8)

## P9 — Cross-Role
- [ ] T901 ROLE_CONFLICTS.md — **NOT GENERATED** (folded into CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md)
- [ ] T902 WORKFLOW_HANDOFFS.md — **NOT GENERATED** (folded into final report §6)
- [ ] T903 SHARED_COMPONENTS.md — **NOT GENERATED** (folded into final report §6)
- [x] T904 PERMISSION_INCONSISTENCIES.md
- [ ] T905 EXPERIENCE_INCONSISTENCIES.md — **NOT GENERATED** (folded into final report §6)
- [ ] T906 INFORMATION_GAPS.md — **NOT GENERATED** (folded into final report §8)

## P10 — Final Synthesis
- [x] T1001 UX_PRODUCT_FORENSICS_V4_5.md
- [ ] T1002 EXECUTIVE_SUMMARY.md — **NOT GENERATED** (executive summary is final report §1)
- [ ] T1003 PRIORITIZED_ROADMAP.md — **NOT GENERATED** (roadmap is final report §5)

---

## Verification Notes
- 17 of 30 planned task files generated. Remaining 13 are **folded** into existing files (marked NOT GENERATED) to avoid duplication.
- All 9 route groups confirmed: (admin), (approver), (home), (mess), (operator), (person), (student), (supervisor), (sysadmin)
- 28 role keys confirmed in roles.ts (was cited as 24 in initial MASTER_STATE — corrected)
- 28 role docs confirmed in docs/roles/ (was cited as 31 — corrected)
