# COMPONENT_INDEX

**Discovery date:** 2026-11-24
**Method:** `ls src/components/` + import analysis
**Evidence level:** OBSERVED

## Directory Layout
```
src/components/
├── admin/          # UserManagementPanel, QuickActions, …
├── approver/       # Cross-role approver components
├── bot/            # Telegram bot UI
├── cinematic/      # Cinematic transitions
├── complaints/     # ComplaintConsole, ComplaintForm, ComplaintDetail
├── dashboard/      # Shared dashboard widgets
├── engagement/     # Engagement metrics
├── ErrorBoundary.tsx
├── faculty/        # FacultyRosterPanel, …
├── hod/            # ApprovalsView, …
├── mess/           # SpecialEventManager, …
├── nav/            # Navigation components
├── operator/       # GateScanner, BiometricPrompt, ScanDetailModal, GatePickerScreen, PassPreview
├── parent/         # ParentCommandBar
├── person/         # Person profile
├── principal/      # PrincipalQuickActions, CoSignModal
├── remotion/       # Video/animation
├── retention/      # Retention widgets
├── RoleEmptyState.tsx, RoleError.tsx, RoleLoading.tsx, RoleOnboarding.tsx, RoleThemeProvider.tsx
├── SakugaLoadingSplash.tsx
├── shared/         # AuthGuard, QuickActions, Sidebar, PwaInstallPrompt, ApprovalInbox, WidgetBoundary, EntityInspector, EmptyState, …
├── shell/          # RoleDesktopShell, role shells
├── student/        # PassCreateFormV2, PassHub, PassHistory, ExtendPassModal, StudentAttendancePage, …
├── supervisor/     # EscalationsView, GateWall, GateActivityView, TeamCurfewView
├── sysadmin/       # 34 unwired domains/* components + wired action panels
├── ui/             # badge, button, card, DataTable, input, modal, select, skeleton, table, toast
└── vp/             # VicePrincipal pending-approvals, VpInboundCard
```

## Key UI Primitives (src/components/ui/)
| Component | Purpose |
|---|---|
| `badge.tsx` | Status pills, role tags |
| `button.tsx` | Primary/secondary/danger/ghost variants |
| `card.tsx` | Surface card (graphite theme) |
| `DataTable.tsx` | Sortable/filterable table |
| `input.tsx` | Text/number input |
| `modal.tsx` | Dialog overlay (z-60) |
| `select.tsx` | Dropdown |
| `skeleton.tsx` | Loading placeholder |
| `table.tsx` | Simple table |
| `toast.tsx` | Toast notifications (z-70) |

## Shared Cross-Cutting Components
| Component | Used By |
|---|---|
| `AuthGuard.tsx` | Every role-protected page |
| `RoleEmptyState.tsx` | 49+ stub pages |
| `RoleError.tsx` | Error boundary per role |
| `RoleLoading.tsx` | Loading states |
| `RoleOnboarding.tsx` | First-run onboarding |
| `QuickActions.tsx` | Role-specific action chips |
| `Sidebar.tsx` | Primary navigation |
| `WidgetBoundary.tsx` | Per-widget error/loading isolation |
| `EntityInspector.tsx` | Read-only detail drawer |
| `ApprovalInbox.tsx` | Shared approval queue (21 unwired shared components) |
| `EmptyState.tsx` | Generic "no data" placeholder |

## 95 Unwired Components (docs/UNWIRED-UI.md)
- **sysadmin/domains/*** — 48 .tsx files (was cited as 34 in initial doc; UNWIRED-UI.md lists 34 of these as unwired, the remaining 14 are wired in sysadmin pages)
- **shared/*** — 21+ (AnnouncementBanner, ApprovalInbox, ConditionalAlert, ConductLedger, ElasticPill, EmergencyPlaybook, FeedbackModal, GlassMeter, GlassParticles, HumanPulseDot, LiveActivityFeed, MobileLabel, …)
- **student/*** — several
- **operator/*** — several
- Remaining across admin, hod, principal, vp, faculty, mess, complaints

**Implication:** 95 built-but-unmounted components represent either (a) intentional primitives not yet wired, or (b) dead code. The `sysadmin/domains/*` cluster (48 total files, 34 unwired) suggests a planned modular sysadmin dashboard that was partially completed.

## Verification Log (2026-11-24)
- 24 component directories: **CONFIRMED** (ls -d count)
- 10 ui/ primitives: **CONFIRMED** (badge, button, card, DataTable, input, modal, select, skeleton, table, toast)
- 48 sysadmin/domains .tsx files: **CORRECTED** from 34 (34 is the unwired count; 14 are wired)
- shared/ has 120+ files including subdirs (achievements, attendance, calendar, complaints, documents, events, meals, notifications, pass, profile): **ADDED** — initial doc undercounted shared/ complexity
- 95 unwired components: **CONFIRMED** (docs/UNWIRED-UI.md, 147 lines)
