# IMPLEMENTATION_QUEUE.md — V4.5-AFX Deterministic Queue

## Already Resolved on `main` (Pre-AFX, Revalidated at `44706eb3`)
- `F-GU-01` (P0): `/api/pass-requests` removed; `guardian/child-status` uses `/api/permissions` + `statusError` + `Retry`.
- `F-GU-02` (P0): Linked guardian pages point to working `child-status` with `?wardId=`.
- `F-HOD-01` (P1): `ApproverDecisionQueue` mounted on `/hod/approvals/pending` & `/escalated`.
- `F-HOD-02` (P1): `POST /api/permissions/bulk` wired in `ApproverDecisionQueue`.
- `F-VP-01` (P1): `ApproverDecisionQueue` + bulk wired on `/vice-principal/pending-approvals`.
- `F-SP-02` / `F-SP-03` (P1): `ApproverDecisionQueue` mounted on `/supervisor/response/{escalations,incidents,exceptions}`.
- `F-SA-01` (P1): `alert()` replaced with inline `role="alert"` + `Retry` on `/sysadmin/actions`.
- `F-SA-02` (P1): `GET/POST /api/academic-status/pending` wired on `/sysadmin/academic-status`.
- `F-EA-01` / `F-EA-02` (P1): `dean`, `chief_warden`, `controller_examinations`, `addl_controller_*` mapped in `src/server/policy/routes.ts`.
- `F-ST-01` (P2): `alert()` replaced with inline `role="alert"` + `Retry` on `/student/mess-bill`.
- `F-FA-01` (P2): 3 `/faculty/subject/*` `EmptyState` stubs replaced with redirects.
- `F-FA-02` (P2): `FacultyRosterPanel` (`PATCH /api/faculty/attendance/roster`) already mounted in `faculty/class/[id]/page.tsx`.
- `F-AD-01` (P2): `POST /api/permissions/[ticket]/revoke` wired in `/admin/passes`.
- `F-SA-04` (P2): `POST /api/sysadmin/autonomous-monitoring` wired in `/sysadmin/autonomous`.
- `F-OP-01` (P3): `usePolling` wired across 8 operator pages.
- `F-OP-03` (P2): Offline queue present in `gate/[gateId]/page.tsx`.
- `F-AD-02` / `F-VP-03` (P3): `/admin/dashboard` and `/vice-principal/examinations` flattened to single-hop redirects.

## Active Actionable Queue (Ordered by Priority)
1. `F-OIE-01` / `F-OIE-02` (P2, `oie`): Verify `/oie/queue/page.tsx` kanban & `EntityInspector` inline actionability; wire `ApproverDecisionQueue` / inline actions if read-only. -> **NEXT**
2. `F-CA-01` (P2, `caretaker`): Verify `CaretakerCommandBar.tsx` visible command chips before focus; add always-visible command chips if hidden until focus.
3. `F-OP-02` (P3, `operator`): Wire quick scan reclassification (`PATCH /api/operator/scans/[id]/category`) directly in `/operator/transactions` or `/operator/lookup` (reducing 2-hop modal friction).
4. `F-ME-01` (P2, `mess_incharge`): Add inventory/stock update write path on `/mess/inventory-stock` (or verify backend endpoint & wire inline form).
5. `F-ST-04` (P3, `student`): Add `usePolling` auto-refresh to `/student/passes` and `/student/complaints`.
6. `F-DW-01` / `F-HM-01` / `F-EX-01` / `F-EM-01` / `F-GU-03` (P2/P3): Revalidate remaining role write paths and record final status.
