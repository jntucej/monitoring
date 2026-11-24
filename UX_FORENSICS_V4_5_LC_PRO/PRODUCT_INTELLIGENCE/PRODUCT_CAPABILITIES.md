# PRODUCT_CAPABILITIES — Capability Map

**Discovery date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## Capability Register

| ID | Capability | Evidence | Related Pages | Related APIs | Roles | Actions | Limitations | Confidence |
|---|---|---|---|---|---|---|---|---|
| C-001 | Pass creation (student) | `PassCreateFormV2.tsx:150` | `/student/permissions/new` | `POST /api/permissions` | student, guardian, parent | Create outpass/exam/memo/class ticket | Config-driven; persona-scoped | HIGH |
| C-002 | Pass approval (HOD) | `ApprovalsView.tsx:56` | `/hod/approvals/pending` | `GET /api/permissions?stage=hod&status=PENDING` | hod | **VIEW ONLY** — no PATCH button | Read-only in HOD | HIGH |
| C-003 | Pass approval (VP) | `vice-principal/pending-approvals:108-110` | `/vice-principal/pending-approvals` | `PATCH /api/permissions/[ticket]` | vice_principal | APPROVE/REJECT/ESCALATE | Actionable | HIGH |
| C-004 | Pass approval (OIE) | `KanbanBoard source="/api/oie/queue"` + `OieCommandBar.tsx:266` | `/oie/queue/pending` + `RoleConsole` | `GET /api/oie/queue?status=PENDING` + `PATCH /api/permissions/[ticket]` (via OieCommandBar) | oie, exam_branch | **Kanban: VIEW ONLY. RoleConsole: ACTIONABLE via OieCommandBar** | Gap: command bar not inlined in kanban | HIGH |
| C-005 | Pass approval (Caretaker) | `CaretakerCommandBar.tsx:171` | `/caretaker/home` | `PATCH /api/permissions/[ticket]` | caretaker | APPROVE/REJECT/ESCALATE/FORWARD via command bar | Unconventional UI | HIGH |
| C-006 | Bulk approval | `src/app/api/permissions/bulk/route.ts` | **NONE** | `POST /api/permissions/bulk` | (guarded) | 100-ticket batch apply | **UNWIRED — no UI consumer** | HIGH |
| C-007 | Direct-generate pass | `principal/passes/page.tsx:67` | `/principal/passes` | `POST /api/permissions/direct-generate` | principal | Mint pass without student request | Only principal surface | HIGH |
| C-008 | Pass revocation | `src/app/api/permissions/[ticket]/revoke/route.ts` | **NONE observed** | `POST /api/permissions/[ticket]/revoke` | (guarded) | Revoke active pass | **UNWIRED — no UI consumer** | MEDIUM |
| C-009 | QR issuance | `src/app/api/permissions/[ticket]/qr/route.ts` | `/student/passes/[ticket]` | `GET /api/permissions/[ticket]/qr` | student | Generate QR for gate scan | Wired | HIGH |
| C-010 | Gate scan (QR) | `PassPreview.tsx:137` | `/gate/[gateId]` | `GET /api/gate/verify-pass` | operator | Verify pass at gate | Advisory preview; actual scan in GateScanner | HIGH |
| C-011 | Gate scan (biometric) | `BiometricPrompt.tsx:56` | `/gate/[gateId]` | `POST /api/gate/verify-thumbprint` | operator | Thumbprint verification | Wired | HIGH |
| C-012 | Scan reclassification | `ScanDetailModal.tsx:119` | `/gate/[gateId]` | `PATCH /api/operator/scans/[id]/category` | operator, supervisor | Reclassify a scan | Wired | HIGH |
| C-013 | Gate claim | `operator/claim/page.tsx:42` | `/operator/claim` | `POST /api/operator/claim-gate` | operator | Assign operator to gate | Wired | HIGH |
| C-014 | Gate mode toggle | `operator/mode/page.tsx:99` | `/operator/mode` | `POST /api/operator/mode` | operator | Toggle gate open/closed | Wired | HIGH |
| C-015 | Manual entry | `operator/manual-entry/page.tsx:139` | `/operator/manual-entry` | `POST /api/operator/manual-entry` | operator | Record entry without scan | Wired | HIGH |
| C-016 | Pass verification at gate | `operator/pass-verification:84` | `/operator/pass-verification` | `PATCH /api/permissions/[ticket]` | operator | Approve/reject at gate | Wired | HIGH |
| C-017 | Occupancy tracking | `OccupancyHeatmap`, `CampusDigitalTwin` | `/admin/occupancy` | `GET /api/occupancy/*` | admin | Live headcount per zone | Read-only | HIGH |
| C-018 | Lockdown broadcast | `admin/lockdown/page.tsx:56,73` | `/admin/lockdown` | `POST/DELETE /api/admin/lockdown` | admin, sysadmin | Activate/lift lockdown | Wired | HIGH |
| C-019 | User management | `UserManagementPanel.tsx` | `/admin/users` | `PATCH/POST /api/admin/users/*` | admin, sysadmin | CRUD + bulk + reset-password | Wired | HIGH |
| C-020 | Academic status flag | `sysadmin/academic-status:63,75` | `/sysadmin/academic-status` | `GET/POST /api/academic-status` | dean, principal, vp, chief_warden, admin, sysadmin | Set academic flag | Wired (roster + flag) | HIGH |
| C-021 | Two-person academic approval | `src/app/api/academic-status/pending/route.ts` | **NONE** | `GET/POST /api/academic-status/pending` | dean, principal, vp, chief_warden | Maker/checker queue | **UNWIRED — no UI consumer** | HIGH |
| C-022 | Complaint CRUD | `ComplaintForm.tsx:39`, `ComplaintDetail.tsx:37-79` | `/student/complaints/*` | `POST/PATCH/DELETE /api/complaints` | student, admin, caretaker | File/close/feedback/attachments | Wired | HIGH |
| C-023 | Mess token issuance | `mess/scan/page.tsx:65` | `/mess/scan` | `POST /api/mess/serve` | mess_incharge | Issue/verify token | Wired | HIGH |
| C-024 | Mess issue filing | `mess/mess-issues/page.tsx:163` | `/mess/mess-issues` | `POST /api/mess/issues` | mess_incharge | File mess issue | Wired | HIGH |
| C-025 | Operational request | `mess/operational-requests:138` | `/mess/operational-requests` | `POST /api/mess/operational-requests` | mess_incharge | Submit operational request | Wired | HIGH |
| C-026 | Visitor check-in/out | `visitor/visit/page.tsx:65-73` | `/visitor/visit` | `POST /api/visitors/me/check-in|check-out` | visitor | Record visit | Wired | HIGH |
| C-027 | Attendance dispute | `StudentAttendancePage.tsx:243` | `/student/attendance` | `POST /api/student/attendance/dispute` | student | Dispute attendance record | Wired | HIGH |
| C-028 | Meal opt-out | `student/mess-bill/page.tsx:35` | `/student/mess-bill` | `POST /api/student/meal-opt-out` | student | Opt out of meal | **`alert()` on failure (line 46)** | HIGH |
| C-029 | Guardian pass timeline | `guardian/child-status/page.tsx:39` | `/guardian/child-status` | `GET /api/pass-requests` **DOES NOT EXIST** | guardian, parent | View ward's passes | **BROKEN — 404 swallowed** | HIGH |
| C-030 | Guardian movement info | `guardian/movement-info:133` | `/guardian/movement-info` | `GET /api/persons/[roll]` + `/history` | guardian, parent | View ward movement | Wired | HIGH |
| C-031 | Supervisor dashboard | `supervisor/home` (325 lines) | `/supervisor/home` | `GET /api/supervisor/dashboard` | supervisor | View gate/escalation status | Wired | HIGH |
| C-032 | Supervisor escalation view | `EscalationsView.tsx:40` | `/supervisor/response/escalations` | `GET /api/supervisor/escalations` | supervisor | View escalations | **READ-ONLY — no PATCH button** | HIGH |
| C-033 | Faculty roster edit | `FacultyRosterPanel.tsx:153` | **NOT MOUNTED** | `PATCH /api/faculty/attendance/roster/[id]` | faculty, hod | Edit attendance roster | **HIDDEN — component not imported** | HIGH |
| C-034 | Exam access management | `exam/superintendent/*` | `/exam/superintendent/*` | `GET /api/exam/*` | exam_superintendent, exam_branch | Manage exam access | Read-only | HIGH |
| C-035 | Cron job management | `/sysadmin/cron` | `/sysadmin/cron` | `GET /api/admin/scheduled-jobs` | sysadmin | View/manage cron | Read-only | HIGH |
| C-036 | Compliance ops | `ComplianceSettings` | `/sysadmin/compliance` | `PATCH/POST /api/admin/retention-policies|compliance/*` | sysadmin | Data governance | Wired | HIGH |
| C-037 | Automation controls | `sysadmin/actions/page.tsx` | `/sysadmin/actions` | `PATCH /api/sysadmin/actions/[id]` + `automation-controls` | sysadmin | Approve/deny automation decisions | **`alert()` on failure (line 150)** | HIGH |
| C-038 | Access key management | `sysadmin/access-keys` | `/sysadmin/access-keys` | `POST/DELETE /api/admin/users/*enrollment-code*` | sysadmin | Issue/revoke enrollment codes | Wired | HIGH |
| C-039 | Announcements CRUD | `AnnouncementsManager` | `/admin/announcements` | `POST/PATCH/DELETE /api/admin/announcements` | admin, sysadmin | Publish/edit/retire announcements | Wired | HIGH |
| C-040 | Class session management | `class-sessions/` | `/faculty/my-classes` | `GET /api/class-sessions` | faculty | View classes | Read-only | HIGH |

## Hidden Capabilities (Backend Exists, No UI)
- C-006: Bulk approval
- C-008: Pass revocation
- C-021: Two-person academic approval
- C-033: Faculty roster edit

## Orphaned Write Endpoints
- `POST /api/passes` — no UI consumer (UI uses `POST /api/permissions` instead)

## Broken Data Sources
- `GET /api/pass-requests` — does not exist; `guardian/child-status` silently shows empty timeline

## Verification Log (2026-11-24)
- 40 capabilities (C-001 through C-040): **CONFIRMED** against API_INDEX.md write-endpoint table
- 4 hidden capabilities (C-006, C-008, C-021, C-033): **CONFIRMED** (all 4 endpoints exist on disk, zero UI consumers)
- 1 orphaned write endpoint (`POST /api/passes`): **CONFIRMED**
- 1 broken data source (`GET /api/pass-requests`): **CONFIRMED** (endpoint does not exist)
- 2 `alert()` blemishes (C-028 line 46, C-037 line 150): **CONFIRMED** in code
- C-029 guardian pass timeline: **CONFIRMED** broken (fetches non-existent endpoint)
- C-032 supervisor escalation read-only: **CONFIRMED** (`EscalationsView.tsx:40` has no PATCH button)
- C-004 OIE queue read-only: **CONFIRMED** (KanbanBoard + EntityInspector only, no action buttons)
- C-033 FacultyRosterPanel not mounted: **CONFIRMED** (grep for `FacultyRosterPanel` import in pages returns 0 matches)

**Suggestion:** Add C-041 for "OIE exam-day access" — the `GET /api/exam/access` endpoint is wired in OIE pages but there is no PATCH path for OIE to grant/deny exam access. This is the same asymmetry as C-004 but at the exam-access level.
- `GET /api/pass-requests` — does not exist; `guardian/child-status` silently shows empty timeline
