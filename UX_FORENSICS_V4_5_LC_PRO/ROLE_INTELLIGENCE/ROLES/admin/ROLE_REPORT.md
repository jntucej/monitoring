# ROLE_REPORT — admin

**Role:** Campus Administrator (`admin`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Overview
The admin surface is a **69-page campus administration console**. It is **read-heavy**: only 7 of ~45 data pages have write actions. The admin can manage users (full CRUD), gates (create/toggle), announcements (CRUD), lockdown (broadcast/lift), academic-automation (trigger), anti-ragging (config), and classes (create). The rest are dashboards, rosters, and inspectors.

## 2. Write Pages (7)
| Page | Write Path |
|---|---|
| `/admin/users` | `PATCH /api/admin/users/[id]`, `POST /api/admin/users/[id]/reset-password`, `POST /api/admin/users/bulk/validate`, `POST /api/admin/users/bulk/commit` |
| `/admin/gates` | `POST /api/admin/gates`, `POST /api/operator/mode` |
| `/admin/gates/[id]` | `PATCH /api/admin/gates/[id]` |
| `/admin/classes` | `POST /api/classes` |
| `/admin/announcements` | `POST/PATCH/DELETE /api/admin/announcements` |
| `/admin/lockdown` | `POST/DELETE /api/admin/lockdown` |
| `/admin/academic-automation` | `POST /api/academic-automation{path}` |
| `/admin/anti-ragging-config` | `PATCH /api/admin/anti-ragging-alert-config` |

## 3. Read-Only Pages (38+)
users (read), roles, staff, faculty, workers, parents, visitors, passes, alumni, gate-schedule, occupancy, events, health, faculty-assignments, permission-policies, gate-device-configuration, support, student-representatives, notification-settings, complaint-chains, complaint-categories, institutional-configuration, students, students/[id], faculty/[id], mess (redirect stub), dashboard (redirect).

## 4. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-AD-01 | 38/45 admin pages are read-only; admin has no pass-revocation button on `/admin/passes` | MEDIUM | P2 | HIGH |
| F-AD-02 | `/admin/dashboard` → `/admin` → `/admin/overview` (two hops to reach the real dashboard) | LOW | P3 | HIGH |
| F-AD-03 | `/admin/mess` is a 122-byte redirect stub | LOW | P3 | HIGH |
| F-AD-04 | No bulk user import/export UI (backend bulk endpoints exist but are validate/commit only) | LOW | P3 | MEDIUM |

## 5. Coverage Statement
| Dimension | Status |
|---|---|
| Page coverage | COMPLETE (69/69) |
| Workflow coverage | COMPLETE (7 write paths) |
| Interaction coverage | COMPLETE |
| State coverage | COMPLETE |
| Accessibility | PARTIAL |
| Performance | NOT MEASURED |
| Task simulation | NOT PERFORMED (deferred) |
