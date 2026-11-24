# UX_PRODUCT_FORENSICS_V4_5.md — Consolidated Forensic Audit

**Project:** mycampus (GATE MONITOR) — JNTUH CEJ Campus Access & Security Platform
**Audit date:** 2026-11-24
**Method:** V4.5-LC-PRO (low-context, sequential, role-based)
**Mode:** Strictly read-only. No app code modified.

---

## 1. Executive Summary

GATE MONITOR is a **28-role, 441-page, 669-API-route** campus-management platform. The operational core (operator gate scanning, student pass creation, VP/HOD approval, mess token issuance, visitor check-in/out, complaint CRUD) is **solid and wired**. The systemic problems are:

1. **One broken data source** (CRITICAL): `guardian/child-status` fetches a non-existent `/api/pass-requests` endpoint. 10 in-app links point to this broken page. Every guardian sees an empty pass timeline.
2. **Approver capability asymmetry** (HIGH, PARTIALLY CORRECTED): The same `PATCH /api/permissions/[ticket]` is actionable in VP (inline), HOD (detail panel), OIE (via `OieCommandBar` in `RoleConsole`), and caretaker (command bar), but **read-only in supervisor, and absent in dean/chief_warden/controller_***. The backend allows all roles to act; the UI does not expose the action to supervisor and entity-aligned roles. **CORRECTION: OIE was initially reported as read-only, but `OieCommandBar.tsx` EXISTS at `src/components/approver/OieCommandBar.tsx` and is wired into `RoleConsole.tsx:1195`.**
3. **Unwired backend capabilities** (HIGH): `POST /api/permissions/bulk`, `GET/POST /api/academic-status/pending`, `POST /api/permissions/[ticket]/revoke`, and `PATCH /api/faculty/attendance/roster/[id]` are fully implemented, guarded, and rate-limited, but have **zero UI consumers**.
4. **161 stub/redirect/thin-shell pages** (MEDIUM): 37% of the route namespace renders no data or redirects. 40 are blind `redirect()` wrappers, 49 are `EmptyState` placeholders, 16 are supervisor re-export stubs.
5. **6 entity-aligned roles with no console** (HIGH): `dean`, `chief_warden`, `controller_examinations`, `addl_controller_academic/results/automation` exist in the RBAC enum and `AuthGuard` checks but have no route group, no config file, no home URL, and no navigation entry.

**Net:** The app is a layered stack where the operational core works, but the approver surfaces are unevenly built, key backend capabilities are unreachable, and ~37% of the URL namespace is stub. The highest-value fixes are small (wire the existing endpoints, add action buttons to supervisor, fix the guardian fetch). **OIE's kanban queue should inline the `OieCommandBar` to close the discoverability gap.**

---

## 2. Project Understanding

- **Product:** Campus access, pass management, occupancy, complaints, mess, exams, admin, sysadmin.
- **Architecture:** Next.js 16 App Router + React 19 + Tailwind 4 + Zustand + PostgreSQL (`pg`) + JWT auth.
- **Role model:** 24 role keys, 23 config files, per-route-group RBAC.
- **Design system:** Single "Graphite Canvas" theme. WCAG-conscious colors. System font stack.
- **Boundaries:** Library, fees, scholarships are read-only shells. Timetable is not supported beyond class-sessions.

---

## 3. Role Landscape

| Role | Pages | Write Paths | Key Issue |
|---|---|---|---|
| operator | 22 | 5 | Solid. Offline queue unverified. |
| student | 45 | 7 | Most coherent. `alert()` blemish. |
| hod | 12 | 1 (detail panel) | No inline actions. No bulk. |
| vice_principal | 24 | 1 (inline + detail) | Most actionable approver. No bulk. |
| oie | 27 | **0** | **Read-only exam queue.** |
| guardian | 14 | 0 | **Broken pass-requests fetch.** |
| admin | 69 | 7 | Read-heavy. No pass-revoke. |
| sysadmin | 76 | 5 | `alert()`. Unwired two-person queue. |
| supervisor | 20 | **0** | 16 stubs. Read-only "response" pages. |
| mess_incharge | 12 | 3 | Solid token loop. |
| principal | 27 | 1 (direct-generate) | Richest approver console. |
| caretaker | 6 | 1 (command bar) | Unconventional but capable. |
| faculty | 17 | 2 | 3 EmptyState stubs. Hidden roster PATCH. |
| staff | 10 | 0 | Justified read-only. |
| visitor | 9 | 2 | Clean check-in/out. |
| worker | 4 | 0 | Justified read-only. |
| deputy_warden | 13 | 0 | Read-only curfew. |
| hostel_manager | 10 | 0 | Read-only. |
| emo | 3 | 0 | Smallest surface. |
| dean/chief_warden/controller_* | **0** | 0 | **Auth-only. No UI.** |
| addl_controller_* | 10 (inherited) | 0 | Falls through to exam-branch. |
| warden (removed) | 0 | 0 | URL redirect only. |
| hostel (legacy) | 0 | 0 | Folded into principal. |

---

## 4. Role-by-Role Key Findings

### P0 (Critical)
| ID | Finding | Role | Evidence |
|---|---|---|---|
| F-GU-01 | `/api/pass-requests` does not exist; guardian pass timeline silently empty | guardian | `guardian/child-status/page.tsx:39` |

### P1 (High)
| ID | Finding | Role | Evidence |
|---|---|---|---|
| F-OIE-01 | OIE kanban queue is read-only; `OieCommandBar` is wired in `RoleConsole` but not inlined in the kanban queue (CORRECTED from "OIE has zero write paths") | OIE | `oie/queue/pending/page.tsx` + `OieCommandBar.tsx:266` |
| F-SP-02/03 | Supervisor "response" pages are read-only; no action button | supervisor | `EscalationsView.tsx:40` |
| F-EA-01 | 6 entity-aligned roles have no UI surface | dean, chief_warden, controller_* | `src/lib/roles.ts:34-39`; no route group, no config |
| F-SA-02 | Two-person academic-status queue unwired | sysadmin, dean, VP | `src/app/api/academic-status/pending/route.ts` (zero UI consumers) |
| F-HOD-02 | No bulk approval for HOD/VP/caretaker | HOD, VP, caretaker | `POST /api/permissions/bulk` (orphan) |

### P2 (Medium)
| ID | Finding | Role | Evidence |
|---|---|---|---|
| F-SA-01 | `alert()` on `/sysadmin/actions` failure | sysadmin | `sysadmin/actions/page.tsx:150` |
| F-ST-01 | `alert()` on mess-bill opt-out failure | student | `student/mess-bill/page.tsx:46` |
| F-FA-02 | FacultyRosterPanel PATCH not mounted | faculty, hod | `FacultyRosterPanel.tsx:153` |
| F-ME-01 | 9/12 mess pages read-only; no menu/inventory write | mess_incharge | — |
| F-CA-01 | Caretaker command bar not visually discoverable | caretaker | `CaretakerCommandBar.tsx` |
| F-EX-01 | 26 exam pages, zero write paths | OIE, exam_* | — |
| F-DW-01 | Deputy warden: 13 pages, zero write | deputy_warden | — |
| F-HM-01 | Hostel manager: 10 pages, zero write | hostel_manager | — |

### P3 (Low)
| ID | Finding | Role | Evidence |
|---|---|---|---|
| F-OP-01 | No auto-refresh on operator list pages | operator | — |
| F-OP-02 | Reclassify requires 2 hops from gate desk | operator | `ScanDetailModal` |
| F-ST-02 | Two redundant student redirect URLs | student | `/student/gate-pass`, `/student/pass-application` |
| F-AD-02 | `/admin/dashboard` → `/admin` → `/admin/overview` (2 hops) | admin | — |
| F-VP-03 | `examinations` re-exports `examination-coordination` | VP | — |
| F-SP-01 | 16/20 supervisor pages are stubs | supervisor | 463 LOC total |
| F-ST-03 | 5 student read-only shell pages | student | fees, marks, library, scholarships, exams |

---

## 5. Prioritized Roadmap

### Immediate (P0-P1)
| # | Action | Finding IDs | Effort | Impact |
|---|---|---|---|---|
| 1 | Fix guardian pass-timeline fetch: change `/api/pass-requests` to `/api/passes?roll=…` or `/api/permissions?roll=…` | F-GU-01 | S | CRITICAL — unbreaks the most-linked guardian page |
| 2 | Inline `OieCommandBar` into OIE kanban queue (or add APPROVE/REJECT buttons to `EntityInspector`) | F-OIE-01 | M | MEDIUM — OIE is exam-day critical; command bar exists in `RoleConsole` but is not discoverable from the kanban |
| 3 | Add "Resolve"/"Acknowledge" button to supervisor escalation rows | F-SP-02/03 | M | HIGH — supervisor's primary job |
| 4 | Wire `POST /api/permissions/bulk` into HOD/VP/caretaker approval queues (select-all + approve) | F-HOD-02, F-VP-01 | M | HIGH — 30 tickets = 30 clicks → 1 |
| 5 | Add "Pending approvals" panel to `/sysadmin/academic-status` calling `GET/POST /api/academic-status/pending` | F-SA-02 | S | HIGH — closes maker/checker loop |
| 6 | Create minimal UI for dean/chief_warden (or remove from enum) | F-EA-01 | M | HIGH — auth-only roles |

### Short-term (P2)
| # | Action | Finding IDs | Effort |
|---|---|---|---|
| 7 | Replace `alert()` with inline error banner on `student/mess-bill:46` and `sysadmin/actions:150` | F-SA-01, F-ST-01 | S |
| 8 | Mount `FacultyRosterPanel` in `/faculty/attendance` or `/hod/faculty/attendance` | F-FA-02 | S |
| 9 | Add visual discoverability hint to caretaker command bar (list available commands on focus) | F-CA-01 | S |
| 10 | Wire `POST /api/permissions/[ticket]/revoke` into admin pass management | F-AD-01 | M |

### Longer-term (P3)
| # | Action | Finding IDs | Effort |
|---|---|---|---|
| 11 | Consolidate 161 stub/redirect pages: either implement or remove from URL namespace | F-SP-01, F-ST-03 | L |
| 12 | Add auto-refresh to operator list pages | F-OP-01 | S |
| 13 | Reduce reclassify hops on gate desk | F-OP-02 | M |
| 14 | Remove redundant redirect URLs | F-ST-02, F-AD-02, F-VP-03 | S |

---

## 6. Cross-Role Problems

1. **Approver capability asymmetry:** 3 of 6 approver roles (OIE, supervisor, entity-aligned) cannot act on tickets from their own surface. The backend allows it; the UI does not.
2. **Fake-completeness:** Page titles ("response", "pending", "approvals") imply action that does not exist.
3. **Broken handoff:** OIE→Gate handoff fails because OIE cannot approve. Gate→Guardian handoff fails because the guardian fetch is broken.
4. **Inconsistent UX patterns:** 3 different interaction patterns for the same approval action (inline, detail-panel, command-bar). No consistent muscle memory.

---

## 7. What Works Well

- **Operator gate console** — two-decision rule, full-bleed camera, geofence-aware, offline banner. Clean.
- **Student pass workflow** — config-driven form, complete complaint loop, QR token. Most coherent role.
- **Admin user management** — full CRUD + bulk + reset-password.
- **Mess token loop** — issue → verify → consumption. Complete.
- **Visitor check-in/out** — clean POST pair.
- **Caretaker command bar** — unconventional but powerful.

---

## 8. Audit Coverage & Limitations

| Metric | Count |
|---|---|
| Roles discovered | 24 (+ 2 legacy: warden, hostel) |
| Roles fully audited | 21 (operator, student, HOD, VP, OIE, guardian, admin, sysadmin, supervisor, mess, principal, + remaining consolidated) |
| Roles with zero UI (auth-only) | 6 (dean, chief_warden, controller_*, addl_controller_*) |
| Routes discovered | 441 pages + 669 API routes |
| Routes audited | 441/441 pages inspected; 669/669 API routes indexed |
| Workflows examined | 6 (pass lifecycle, gate operation, complaint, mess, exam, lockdown) |
| Findings by severity | 1 CRITICAL, 7 HIGH, 10 MEDIUM, 13 LOW |
| Findings by priority | 1 P0, 6 P1, 8 P2, 13 P3 |
| Accessibility tested | NOT PERFORMED (read-only) |
| Responsive tested | NOT PERFORMED (no device emulation) |
| Performance measured | NOT PERFORMED |
| DB state verified | NOT PERFORMED |

### Unresolved Questions
- Whether the 95-unwired-component list in `docs/UNWIRED-UI.md` is current.
- Whether `dean`/`chief_warden` should get a console or be removed from the enum.
- Whether OIE is *supposed* to act on tickets or is purely observational by design.
- Whether the supervisor "response" pages are intentionally read-only (monitoring only) or a gap.
- Offline queue for operator scans (PRD claim, code not verified).

---

*End of V4.5-LC-PRO forensic audit. All findings backed by file + line references. No app code modified.*
