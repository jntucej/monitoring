# GLOBAL_QUEUE.md — V5 Dynamic Implementation Queue

| ID | Title | Category | Severity | Priority | Role | Page | Root Cause Status | Implementation Status | Verification Status | Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| F-AD-04 | Bulk user import/export UI | UX/Feature | LOW | P3 | admin | `/admin/users` | VERIFIED | ALREADY_FIXED | VERIFIED | Closed (`UserManagementPanel` has full 2-phase bulk import modal) |
| F-HOD-03 | 15s TTL on approval queue | UX/Perf | LOW | P3 | hod | `/hod/approvals` | VERIFIED | VERIFIED | VERIFIED | Closed (`fa4da8d1`: added `usePolling(refresh, { intervalMs: 15_000 })`) |
| F-AD-03 | `/admin/mess` redirect stub | Navigation | LOW | P3 | admin | `/admin/mess` | VERIFIED | STALE | VERIFIED | Intentional single-hop `redirect("/admin/mess/items")` |
| F-SP-01 | 16/20 supervisor re-export stubs | Navigation | MEDIUM | P2 | supervisor | `/supervisor/*` | VERIFIED | STALE | VERIFIED | Intentional route aliases in `role-inventory.json` (`387/387` clean) |
| F-SP-04 | Supervisor 20 URLs / ~5 views | Navigation | MEDIUM | P2 | supervisor | `/supervisor/*` | VERIFIED | STALE | VERIFIED | Collapsed with `F-SP-01` |
| F-VP-02 | 22/24 VP pages read-only | UX | LOW | P3 | vice_principal | `/vice-principal/*` | VERIFIED | STALE | VERIFIED | Intentional read-only analytics/history views; approvals live |
| F-PR-02 | 24/27 Principal pages read-only | UX | LOW | P3 | principal | `/principal/*` | VERIFIED | STALE | VERIFIED | Intentional read-only governance/analytics views; approvals live |
| F-OIE-03 | OIE secondary pages read-only | UX | LOW | P3 | oie | `/oie/*` | VERIFIED | STALE | VERIFIED | Intentional read-only records/reports; queues live |
| F-SA-03 | 20+ sysadmin pages stubs/shells | UX | LOW | P3 | sysadmin | `/sysadmin/*` | VERIFIED | STALE | VERIFIED | Intentional read-only telemetry/audit views; actions/autonomous live |
| V45-33 | 33 V4.5 findings already resolved | Various | — | — | all | — | VERIFIED | VERIFIED | VERIFIED | Closed in V4.5-AFX (`44706eb3`..`54cae9b0`) |
