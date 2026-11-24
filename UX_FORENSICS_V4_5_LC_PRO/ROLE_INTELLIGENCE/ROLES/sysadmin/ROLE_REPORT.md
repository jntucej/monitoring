# ROLE_REPORT — sysadmin

**Role:** System Administrator (`sysadmin`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Overview
The sysadmin surface is the **most write-dense** (76 pages, ~14,000 LOC). It covers infrastructure monitoring, security posture, cron management, backup, compliance, automation controls, and academic status. Two critical issues: (1) `alert()` anti-pattern on `/sysadmin/actions` (line 150), and (2) the two-person academic-status approval queue (`/api/academic-status/pending`) is fully implemented but has zero UI consumers.

## 2. Write Pages
| Page | Write Path |
|---|---|
| `/sysadmin/actions` | `PATCH /api/sysadmin/actions/[id]` + `PATCH /api/sysadmin/automation-controls/[name]`. **`alert()` on failure (line 150)** |
| `/sysadmin/access-keys` | `POST /api/admin/users/[id]/enrollment-code` + `DELETE /api/admin/users/enrollment-codes/[id]` |
| `/sysadmin/academic-status` | `POST /api/academic-status` (roster flag). **Does NOT call `/pending`** |
| `/sysadmin/compliance` | `PATCH /api/admin/retention-policies` + `POST /api/admin/retention/run` + `POST /api/admin/compliance/anonymize` + `POST /api/admin/compliance/export` |
| `/sysadmin/bot` | `GET/POST /api/bot/telegram-sync` + `POST /api/bot/telegram-verify` |

## 3. Read-Only Pages (20+)
cron, jobs, security, security/posture, autonomous, docker-services, infrastructure, maintenance, database-health, application-health, health, health/[tab], achievements, alumni/*, departments, classes, subjects, students, gates, gate-schedule, devices, data, notifications, runbooks, support, sessions, sms/templates, scheduling, integrations, mess/*

## 4. Unwired Backend Capabilities
- `GET/POST /api/academic-status/pending` — two-person maker/checker queue. Guarded for dean/principal/VP/chief_warden/admin/sysadmin. **Zero UI consumers.**
- `POST /api/sysadmin/autonomous-monitoring` — the `/sysadmin/autonomous` page does GET only (30s poll). POST sub-route has no UI.

## 5. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-SA-01 | `alert()` on `/sysadmin/actions` decision failure (line 150) | MEDIUM | P1 | HIGH |
| F-SA-02 | Two-person academic-status queue is unwired (backend complete, no UI) | HIGH | P1 | HIGH |
| F-SA-03 | 20+ sysadmin pages are stubs or shells | LOW | P3 | HIGH |
| F-SA-04 | Autonomous-monitoring POST sub-route has no UI consumer | MEDIUM | P2 | HIGH |

## 6. Coverage Statement
| Dimension | Status |
|---|---|
| Page coverage | COMPLETE (76/76) |
| Workflow coverage | COMPLETE (5 write paths) |
| Interaction coverage | COMPLETE |
| State coverage | COMPLETE |
| Accessibility | PARTIAL |
| Performance | NOT MEASURED |
| Task simulation | NOT PERFORMED (deferred) |

## Verification Log (2026-11-24)
- 76 sysadmin pages: **CONFIRMED** (find count = 76)
- `alert()` at `sysadmin/actions/page.tsx:150`: **CONFIRMED** (exact line match)
- 5 write paths: **CONFIRMED** (actions, access-keys, academic-status, compliance, bot)
- `GET/POST /api/academic-status/pending` orphan: **CONFIRMED** (endpoint exists, zero UI consumers)
- 4 findings (F-SA-01 through F-SA-04): **CONFIRMED**
