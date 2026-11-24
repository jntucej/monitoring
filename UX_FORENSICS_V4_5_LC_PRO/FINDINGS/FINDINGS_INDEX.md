# FINDINGS_INDEX

**Generated:** 2026-11-24
**Source:** All ROLE_REPORT.md files + CROSS_ROLE_FORENSICS + FINAL_REPORT

## Findings by ID

| ID | Role | Finding | Severity | Priority | Status |
|---|---|---|---|---|---|
| F-OP-01 | operator | No auto-refresh on operator list pages | LOW | P3 | OPEN |
| F-OP-02 | operator | Reclassify requires 2 hops from gate desk | LOW | P3 | OPEN |
| F-OP-03 | operator | Offline resilience claimed in PRD but no offline-queue code observed | MEDIUM | P2 | UNVERIFIED |
| F-ST-01 | student | `alert()` on mess-bill opt-out failure (line 46) | LOW | P2 | OPEN |
| F-ST-02 | student | Two redundant redirect URLs | LOW | P3 | OPEN |
| F-ST-03 | student | 5 read-only shell pages (fees, marks, library, scholarships, exams) | LOW | P3 | OPEN |
| F-ST-04 | student | No auto-refresh on student list pages | LOW | P3 | MEDIUM confidence |
| F-HOD-01 | hod | No inline action buttons on approval list | MEDIUM | P1 | OPEN |
| F-HOD-02 | hod | No bulk approval (backend `POST /api/permissions/bulk` unwired) | MEDIUM | P1 | OPEN |
| F-HOD-03 | hod | 15s TTL on approval queue | LOW | P3 | MEDIUM confidence |
| F-VP-01 | vice_principal | No bulk approval for VP | MEDIUM | P1 | OPEN |
| F-VP-02 | vice_principal | 22/24 VP pages are read-only | LOW | P3 | OPEN |
| F-VP-03 | vice_principal | `examinations` re-export of `examination-coordination` | LOW | P3 | OPEN |
| F-OIE-01 | oie | OIE kanban queue is read-only; `OieCommandBar` in RoleConsole not inlined (CORRECTED from "zero write paths") | MEDIUM (downgraded from HIGH) | P2 (downgraded from P1) | OPEN |
| F-OIE-02 | oie | `EntityInspector` on kanban is inspection-only | MEDIUM (downgraded from HIGH) | P2 (downgraded from P1) | OPEN |
| F-OIE-03 | oie | OIE has 12 pages; 1 write path via RoleConsole; exam-branch/superintendent read-only | LOW (downgraded from MEDIUM) | P3 (downgraded from P2) | OPEN |
| F-GU-01 | guardian | `/api/pass-requests` does not exist; guardian pass timeline silently empty | CRITICAL | P0 | OPEN |
| F-GU-02 | guardian | 12 in-app links point to the broken child-status page | HIGH | P0 | OPEN |
| F-GU-03 | guardian | Guardian surface has zero write paths (purely observational) | LOW | P3 | OPEN |
| F-SP-01 | supervisor | 16/20 supervisor pages are 5-16-line re-export stubs | MEDIUM | P2 | OPEN |
| F-SP-02 | supervisor | "Response" pages (escalations, incidents, exceptions) are read-only; no PATCH/POST | HIGH | P1 | OPEN |
| F-SP-03 | supervisor | Supervisor can see problems but cannot act on them from these pages | HIGH | P1 | OPEN |
| F-SP-04 | supervisor | 20 URLs look like a full console; only ~5 distinct views exist | MEDIUM | P2 | OPEN |
| F-AD-01 | admin | 38/45 admin pages are read-only; no pass-revocation button | MEDIUM | P2 | OPEN |
| F-AD-02 | admin | `/admin/dashboard` → `/admin` → `/admin/overview` (two hops) | LOW | P3 | OPEN |
| F-AD-03 | admin | `/admin/mess` is a 122-byte redirect stub | LOW | P3 | OPEN |
| F-AD-04 | admin | No bulk user import/export UI | LOW | P3 | MEDIUM confidence |
| F-SA-01 | sysadmin | `alert()` on `/sysadmin/actions` decision failure (line 150) | MEDIUM | P1 | OPEN |
| F-SA-02 | sysadmin | Two-person academic-status queue is unwired | HIGH | P1 | OPEN |
| F-SA-03 | sysadmin | 20+ sysadmin pages are stubs or shells | LOW | P3 | OPEN |
| F-SA-04 | sysadmin | Autonomous-monitoring POST sub-route has no UI consumer | MEDIUM | P2 | OPEN |
| F-ME-01 | mess_incharge | 9/12 mess pages are read-only; menu/inventory management has no write path | MEDIUM | P2 | OPEN |
| F-ME-02 | mess_incharge | Mess token loop is complete | — | — | INFO |
| F-PR-01 | principal | Principal is the only role with `direct-generate` capability | INFORMATIONAL | P3 | INFO |
| F-PR-02 | principal | 24/27 principal pages are read-only | LOW | P3 | OPEN |
| F-CA-01 | caretaker | Command bar has no visual discoverability hint | MEDIUM | P2 | MEDIUM confidence |
| F-EX-01 | exam_* | 26 exam pages, zero write paths | MEDIUM | P2 | OPEN |
| F-FA-01 | faculty | 3 faculty EmptyState stubs | MEDIUM | P2 | OPEN |
| F-FA-02 | faculty | FacultyRosterPanel PATCH not mounted in any page | MEDIUM | P2 | OPEN |
| F-FA-03 | staff | No write paths on staff surface (justified) | — | — | INFO |
| F-VI-01 | visitor | Visitor check-in/out clean (no issues) | — | — | INFO |
| F-DW-01 | deputy_warden | 13 pages, zero write paths | MEDIUM | P2 | OPEN |
| F-HM-01 | hostel_manager | 10 pages, zero write paths | MEDIUM | P2 | OPEN |
| F-EM-01 | emo | 3 pages, zero write paths. Smallest role surface. | LOW | P3 | OPEN |
| F-EA-01 | entity-aligned | 6 entity-aligned roles are auth-only (no UI surface) | HIGH | P1 | OPEN |
| F-EA-02 | entity-aligned | `dean` referenced in AuthGuard for academic-status but has no console | HIGH | P1 | OPEN |

## Summary

| Severity | Count |
|---|---|
| CRITICAL | 1 (F-GU-01) |
| HIGH | 6 (F-GU-02, F-SP-02, F-SP-03, F-SA-02, F-EA-01, F-EA-02) |
| MEDIUM | 13 |
| LOW | 17 |
| INFORMATIONAL | 4 |
| **TOTAL** | **45** |

| Priority | Count |
|---|---|
| P0 | 2 |
| P1 | 6 |
| P2 | 12 |
| P3 | 15 |
| — | 4 |
