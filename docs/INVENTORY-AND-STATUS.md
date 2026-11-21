# What We Have Done — Inventory & Status

Full file-by-file inventory of what exists in the repo, honestly tagged. This is the backlog-driver: every line is either shippable proof, or a ticket waiting to be opened.

**Legend:** ✅ functional (fetch + display + action) · 🟡 display-only · 🔴 label-only · ⛔ broken/empty · 📋 page shell (nav only) · 🔁 duplicate

---

## 1. Platform / infrastructure — ✅ DONE

| Area | What exists |
|---|---|
| Design system | `ui/badge`, `button`, `card`, `input`, `modal`, `select`, `skeleton`, `table`, `toast`, `DataTable` — all present and used |
| Auth & guard | `AuthGuard`, `RoleGate`, `GuardedPage`, `LoginForm`, `ChangePasswordCard`, `PasswordRules`, `StepUpModal` — full flow |
| Shells | `shell/RoleDesktopShell`, `RoleMobileShell`, `RoleSidebar`, `RoleNotificationBell`, `SafeAreaAppShell` — full |
| Error handling | `ErrorBoundary`, `RoleError`, `RoleLoading`, `RoleEmptyState`, `WidgetBoundary` (multiple copies) |
| Theme | `RoleThemeProvider`, `ThemePicker` (student only), `useAtmosphereTheme`, `SakugaLoadingSplash` |
| Layout primitives | `Board`, `GridBoard`, `KanbanBoard`, `IconRail`, `MobileNavDrawer`, `MobileGroupsDrawer`, `ProfileMenuButton` |
| Status & signalling | `StatusBadge`, `PersonBadge`, `SlaBadge`, `ElasticPill`, `NetworkStatusBanner`, `LiveEventToaster` |
| Timeline & tickets | `RequestTimeline`, `MyTicketsPanel`, `TicketKpiStrip`, `ApprovalInbox` |
| Onboarding | `OnboardingTour`, `RoleOnboarding`, `PwaInstallPrompt`, `ShakeDetector` |
| Bot | **Full chat subsystem**: `BotPanel`, `BotComposer`, `BotMessages`, `BotWelcome`, `FloatingBot`, `LanguageToggle`, `VoiceWave`, `ListeningParticles`, `CitationChip`, `useBotChat`, `role-welcome`, `crossTab`, `store` — real implementation |
| Cinematic | `AmbientGlow`, `CinematicLoader`, `FilmGrain`, `Fireflies`, `MoonGlow`, `HorizonGlow`, `ParticleField`, `CursorHalo`, `useTimeGreeting` — decorative, all work |
| Charts | `ChartRenderer` + `ChartRendererImpl` (8 types), `ChartTypeSwitcher`, `ChartCard` (6 copies), `GlassMeter`, `CountUp`, `RadialMeter`, `MiniStat`, `KpiCard` |

---

## 2. Auth, roles, navigation — ✅ DONE

| File | Status |
|---|---|
| `RoleConsole` | ✅ role dispatcher |
| `RoleHierarchyGraph` | 🟡 display only |
| `RoleGate`, `GuardedPage`, `AuthGuard` | ✅ gate access |
| `RoleSidebar`, `AdminSidebar`, `sysadmin/Sidebar` | ✅ manifest-driven, three implementations |
| `AdminCommandBar`, `CaretakerCommandBar`, `DeputyWardenCommandBar`, `MessInchargeCommandBar`, `OieCommandBar`, `ParentCommandBar`, `PermissionCommandBar`, `PrincipalCommandBar`, `SupervisorCommandBar`, `SysadminCommandBar`, `VpCommandBar`, `WorkerCommandBar` | **12 files** — ✅ each has working parser, but 12 copies of the same pattern |

---

## 3. Admin console — ✅ most functional

| File | Status |
|---|---|
| `AnnouncementsManager` | ✅ full CRUD |
| `ExitReasonsManager` | ✅ full CRUD |
| `SupportDashboard` | ✅ load + patch + advance + close |
| `GateSchedule` | ✅ fetch + create/delete |
| `CollegeInfoForm` | ✅ fetch + save |
| `UserManagementPanel` | ✅ bulk import, suspend, password reset, filters |
| `AdminAuditLogViewer` | ✅ fetch + filters + pagination + export + race guard |
| `OccupancyHeatmap` | ✅ real `/api/occupancy/presence-matrix` + drill-down |
| `HealthDashboard` | ✅ poll + fetch (with documented double-poll fix) |
| `SmsComposer`, `SmsQueue`, `SmsTemplates` | ✅ send, retry, cancel, edit |
| `SmsComposer/Queue/Templates` — 3 files | ✅ |
| `DevMessagesPanel` | ✅ poll + display |
| `CampusStatusBar` | ✅ fetch + poll |
| `EntryExitChart` | ✅ lazy + intersection + poll (over-engineered but works) |
| `StudentList`, `PersonList`, `StudentInfographics` | ✅ fetch + search |
| `AdminSidebar` + `AdminSidebarInfographic` | ✅ manifest-driven |
| `PassTypesForm` | 🔴 **5-field only** — no persona/duration/quota/curfew/consent |
| `CampusDigitalTwin` | 🔴 hardcoded zones, cosmetic |
| `AdvancedAnalytics` | ✅ fetch + save reports + run (no edit saved view) |
| `SustainabilityDashboard` | ✅ fetch + export |
| `UserAnalytics` | ✅ fetch + export |
| `PredictiveAnalytics` | 🟡 fetch + retrain (thresholds not editable) |
| `OccupancyAnalytics`, `TrafficAnalytics`, `SustainabilityAnalytics`, `WebhooksAnalytics` | 🔴 **SCAFFOLD:ANALYTICS** — generated stubs, sample-data fallback |
| `FacultyTracking`, `StaffTracking`, `WorkerShiftTracker` | 🟡 display + modal, **no edit** |
| `GateCardsGrid` | 🔴 contains only `GateCard`, no grid |
| `GateDeviceTracker` | 🟡 display, `isOnline` stored not computed |
| `StatCard` | 🟡 "Metric Context Modal" placeholder |
| `CampusStatusCards` | 🟡 presentational (parent fetches) |
| `CsvValidationPreview` | 🟡 presentational (commit is in parent) |
| `SmartSchedulingAssistant` | 🟡 apply body truncated — unknown backend |
| `admin/shared/GlassCard`, `GlassInteractiveCard`, `GlossyFloatingContainer`, `WordByWordText` | ⛔ **empty files** |
| `admin/shared/PageHeader` | ⛔ **returns `null`** |
| `admin/kit/index`, `kit/sidebar/index`, `kit/viz/index` | ⛔ **empty/comment-only barrels** |
| `admin/kit/sidebar/*` (8 Mini* files) | ✅ presentational, working |
| `admin/shared/ChartRenderer*`, `ChartCard`, `ChartTypeSwitcher`, `ConfirmDialog`, `ContextPanel`, `CountUp`, `EmptyState`, `QuickActions`, `SectionCard`, `WidgetBoundary` | ✅ shared primitives |

**Verdict:** ~30 admin files functional, ~6 scaffolds, ~4 broken, ~6 display-only.

---

## 4. Approver consoles — ✅ core engine, 15 copies of the shell

### Functional engine
| File | Status |
|---|---|
| `AcademicsDepartmentPanel` | ✅ **reference implementation** — single-flight + memo + inline edit + seed fallback |
| `AdminAlertsPanel` | ✅ real `/api/admin/alerts` |
| `ChildActivityPanel` | ✅ real `/api/parents/me` |
| `PermissionCommandBar` | ✅ full parser + approve/reject/escalate |
| `DeputyWardenCommandBar` | ✅ forward + delegate |
| `CaretakerCommandBar` | ✅ assign/resolve/escalate |
| `PermissionList`, `PermissionRow`, `PermissionDetailPanel`, `PermissionContextPanel`, `PermissionRequestForm` | ✅ real |
| `StageQueuePanel`, `BulkActionsBar`, `EscalationPanel`, `HandoffPanel`, `ApprovalInbox` | ✅ UI + actions (reason field optional in Bulk) |
| `SlaBadge` | ✅ timer (not clickable) |
| `DigitalSignPanel` | ✅ sign action |
| `DirectGenerateModal` | 🔴 `DirectGenReason` is a hardcoded TS union |
| `AllocationPanel` | ⛔ **`ready` branch never fires** — always empty |

### The 15 StatusBar copies — 🟡
`AdminStatusBar`, `CaretakerStatusBar`, `ExamBranchStatusBar`, `ExamSuperintendentStatusBar`, `HostelManagerStatusBar`, `MessInchargeStatusBar`, `OieStatusBar`, `ParentStatusBar`, `PermissionStatusBar`, `PrincipalStatusBar`, `StaffStatusBar`, `SupervisorStatusBar`, `SysadminStatusBar`, `VpStatusBar`, `WorkerStatusBar`

All are identical: `● counts · last updated · spinner`. Fine, but 15 copies.

### The 12 CommandBar copies — ✅ but duplicated
`AdminCommandBar`, `CaretakerCommandBar`, `DeputyWardenCommandBar`, `MessInchargeCommandBar`, `OieCommandBar`, `ParentCommandBar`, `PermissionCommandBar`, `PrincipalCommandBar`, `SupervisorCommandBar`, `SysadminCommandBar`, `VpCommandBar`, `WorkerCommandBar`

### Role dashboard panels — 🟡
`AdminCommandBar` → `/admin/*` routes exist
`CaretakerStatusBar`, `MessInchargeStatusBar`, etc. — presentational
`ExamDayPanel`, `IncidentPanel`, `LiveActivityPanel`, `MealServePanel`, `MyWorkPanel`, `OieQueuePanel`, `PrincipalDashboardPanel`, `RoleDashboardPanel`, `SysadminHealthPanel`, `TodayMealsPanel`, `VpDashboardPanel` — **all display**

**Verdict:** approver engine is ✅ solid; the per-role shell is 15 presentational copies and ~12 display-only panels.

---

## 5. Student — the focus area — **3 functional out of ~30**

### ✅ Can actually do
| File | What works |
|---|---|
| `student/PassCreateForm` | Create a pass |
| `student/PermissionRequestForm` | Create a permission request |
| `student/ThemePicker` | Change theme |
| `student/SakugaControls` | Cinematic effects toggle (decoration) |

### 🟡 Display-only — can see, can't act
| File | What's displayed | What's missing |
|---|---|---|
| `student/home/ActivePassCard` | Active pass | extend, cancel, track, dispute |
| `student/home/CampusPulseStrip` | Pulse | filter, drill-down |
| `student/home/ContextCard` | Context | — |
| `student/home/TodayStatus` | Today | — |
| `student/home/QuickLinksRow` | Nav links | — |
| `student/home/GuardianCallButton` | Call button | only functional home item |
| `student/widgets/curfew` | Curfew time | late-mark, extension, dispute |
| `student/widgets/lastscan` | Last scan | dispute |
| `student/widgets/monthly` | Monthly summary | compare, export |
| `student/widgets/passes` | Pass summary | live status |
| `student/ActivePasses` | List | edit, QR, cancel, extend |
| `student/PermissionTicketCard` | Ticket | inline actions |
| `student/DigitalIdCard` | ID | re-issue, share, QR |
| `student/RecentActivity` | List | tap-to-act |
| `student/AcademicPersonalSection` | Academic | attendance dispute, drill-down |
| `student/PassQrModal` | QR | extend, cancel, remaining uses |
| `student/DocumentUploadPanel` | Upload | status, rejection, re-upload |
| `student/MessFoodPreference` | Veg/non-veg toggle | meal rating, history, wastage |

### 📋 Page shells / no page exists
| Feature | Status |
|---|---|
| Attendance page | **does not exist** — only widgets |
| Pass history page | **does not exist** |
| Meal history page | **does not exist** |
| Records / My data page | **does not exist** |
| Dispute flow | **does not exist** |
| Profile page (persona-aware) | **does not exist** — `UserProfileTab` is generic |
| Event RSVP / check-in / feedback | **does not exist** |
| Notification inline actions | **does not exist** |
| Outpass hosteller flow | **does not exist** (only approver `OutpassPanel`) |

**Verdict:** student is **3 functional + 18 display + 9 missing pages.**

---

## 6. Engagement — 🟡 display-only, **1 trapped diamond**

| File | Status |
|---|---|
| `DashboardCustomizer` | ✅ **FUNCTIONAL — but trapped in `engagement/`, not mounted on student home** |
| `EventCard` | 🟡 display — no RSVP button |
| `EventsPanel` | 🟡 list only |
| `Achievements` | 🟡 display — no proof links to activities |
| `ActivityTimeline` | 🟡 display — not clickable |
| `AttentionQueue` | 🟡 display |
| `CampusAssistant` | ✅ assistant (assumed) |
| `CampusFeed` | 🟡 display (no post/comment/reaction) |
| `Communities` | 🟡 display |
| `MyCampusProfile` | 🟡 display + likely edit |
| `PersonalGoals` | 🟡 create only — no progress view, no link to activities |
| `SemesterRecap` | 🟡 static display — no export, no share |
| `EngagementWidgets` | 🟡 wrapper |
| `EventCard` | 🟡 display only |

**Verdict:** the single best student component (`DashboardCustomizer`) is **not where students use it**. Mount it and the student home becomes interactive in one PR.

---

## 7. Complaints — ✅ functional

| File | Status |
|---|---|
| `ComplaintConsole` | ✅ admin view |
| `ComplaintDetail` | ✅ detail + resolve |
| `ComplaintForm` | ✅ create |

No complaint timeline, no resolution rating, no escalation — but the core loop works.

---

## 8. Principal — ✅ core, 🟡 half display

| File | Status |
|---|---|
| `principal/inbox/*` (InboxList, InboxCard, InboxDetailSheet, InboxBatchBar, InboxFilters, useInboxData) | ✅ real batch actions |
| `principal/hostels/*` (Overview, ActivityFeed, ComplaintList, Curfew) | 🟡 display |
| `principal/_components/AuditRecords`, `DecisionCard`, `DepartmentRow`, `HostelPanels`, `OutpassPanel`, `PresenceMatrix`, `RetentionWidgets`, `StatCard` | 🟡 display |
| `principal/delegation/DelegationForm` | ✅ create |
| `principal/shared/*` (13 files) | ✅ shell (PrincipalShell, Sidebar, TopBar, NotificationCenter) + 3 empty/loading states |
| `principal/_components/fetchJson`, `types`, `DepartmentRow` | ✅ utility |

---

## 9. Faculty — 🟡 display

| File | Status |
|---|---|
| `ClassRoster` | 🟡 display |
| `StudentContextPanel` | 🟡 display |

**No mark-attendance action, no dispute inbox, no class schedule creation.** Faculty cannot yet do what students need them to do.

---

## 10. Parent — 🟡 display

| File | Status |
|---|---|
| `ChildActivity` | 🟡 display |
| `ChildStatus` | 🟡 display |
| `ChildWeeklyActivity` | 🟡 display |
| `RequestPassForm` | ✅ create |

**No parent consent flow** (hosteller outpass), **no digest**, **no child pass status card**.

---

## 11. Mess — 🟡 mostly display

| File | Status |
|---|---|
| `MessOperations` | 🟡 display |
| `MealReviewPanel` | 🟡 display (aggregation view, no edit) |
| `SpecialEventManager` | 🟡 display |
| `SpecialItemSelector` | 🟡 display |
| `TokenVerifier` | ✅ verify + scan history |
| `InterestCountsPanel` | 🟡 display |
| `MyEventToken` | 🟡 display |
| `HostelOnlyGate` | ✅ guard |

---

## 12. Operator — ✅ mostly functional

| Area | Status |
|---|---|
| `camera/OperatorCamera`, `SnapSuccess` | ✅ |
| `drawer/*` (6 files) | ✅ |
| `profile/*` (2 files) | ✅ |
| `sheet/*` (Confirm, ManualEntry) | ✅ |
| `Scanner`, `ScanViewfinder`, `ScanConfirmation`, `ScanDetailModal`, `SuccessFlash`, `PassPreview`, `RecentScans`, `RecentScansSheet` | ✅ |
| `BiometricPrompt`, `GateConfirmCard`, `GateModeBanner`, `GatePickerScreen`, `GeoFenceWarning`, `OfflineBanner` | ✅ |
| `BreakdownPanel`, `OperatorStats`, `OutingPanel` | 🟡 display |
| `VoiceAssistantModal` | ✅ |

**Verdict:** operator is one of the most functional areas — real scan loop, real offline, real geo-fence.

---

## 13. Sysadmin — ✅ core functional, 🟡 domain drawers display

| Area | Status |
|---|---|
| `domains/overview/CommandCenterContent`, `ServiceInspector` | ✅ |
| `domains/access` (AccessContent, AccessDrawer) | ✅ |
| `domains/alerts` (AlertsContent, AlertsDrawer, RunbooksContent, RunbooksDrawer, SafetyContent, SafetyDrawer) | ✅ |
| `domains/automation` (Deployments, Jobs, Maintenance Content+Drawer) | ✅ |
| `domains/data`, `domains/gates`, `domains/governance`, `domains/identity`, `domains/monitoring`, `domains/platform`, `domains/reference` | ✅ each has Content + Drawer |
| `monitoring/DockerFleetPanel` | ✅ |
| `primitives/index` | ✅ |
| Top-level: `ActiveSessions`, `AlumniPanel`, `AuditFilters`, `AuditLogRow`, `AuditLogViewer`, `BackupManagement`, `BulkUserImportModal`, `ComplianceSettings`, `CsvBulkImporter`, `CsvValidationPreview`, `EnrollmentCodeModal`, `GateManagement`, `HealthDashboard`, `HodIdInput`, `IntegrationsDashboard`, `LMSIntegration`, `PromotionRequests`, `ScheduledJobs`, `ScheduledJobsPanel`, `SchedulingPanel`, `SecurityManagement`, `Sidebar`, `SidebarInfographic`, `SysAdminControlPanel`, `SysAdminGovernanceModules`, `SystemSettings`, `UserManagement`, `UserRolesPanel` | ✅/🟡 mixed, real endpoints |
| `sysadmin/kit/sidebar/*` (8 Mini* files) | ✅ presentational |
| `sysadmin/kit/viz/*` (CalendarHeatmap, ChainDots, FlowMap, GeoMap, HeatMatrix, HeatStrip, Sankey) | ✅ presentational |

**Verdict:** sysadmin is the most complete operational console.

---

## 14. Retention — 🟡 mixed

| File | Status |
|---|---|
| `CampusFeedbackDesk` | ✅ form + view |
| `CampusKnowledgeCentre` | 🟡 display |
| `ContributionPortfolio` | 🟡 display |
| `DigitalHandover` | 🟡 display |
| `PersonalizedCampusHome` | 🟡 display |
| `PrincipalDigest` | 🟡 display |
| `RoleAnalytics` | 🟡 display |
| `TaskContinuity` | 🟡 display |
| `UnifiedCampusCalendar` | 🟡 display — **not linked to events/passes/meals** |

---

## 15. Person / dashboard / supervisor — minimal

| File | Status |
|---|---|
| `person/AccessRestrictions`, `EmployeeStats`, `WorkerStats` | 🟡 display |
| `dashboard/HostelDashboard`, `RadialMeter`, `dashboard-shared` | 🟡 display |
| `supervisor/GateClaimCodePanel` | ✅ |
| `remotion/*` (4 files) | ✅ video compositions |

---

## 16. Shared primitives — ✅ all work, 📋 many unused

`AnnouncementBanner`, `Board`, `ConditionalAlert`, `ContactLink`, `DigestBoard`, `DynamicHeader`, `EmergencyPlaybook`, `FeedbackModal`, `GlassParticles`, `HumanPulseDot`, `LiveActivityFeed`, `LiveEventsPanel`, `LiveEventToaster`, `ListSkeleton`, `MiniStat`, `MyTicketsPanel`, `OnboardingTour`, `QuickActions`, `ReasonSelect`, `RequestTimeline`, `RoleFlash`, `RoleHierarchyGraph`, `ScrollEdgeBlue`, `ShakeDetector`, `Spinner`, `StatusBar`, `TicketKpiStrip`, `UniversalSupportForm`, `UserProfileTab`, `WordByWordText`

All ✅, but `UserProfileTab` and `ReasonSelect` are the only ones with a real policy payload. The rest are presentational.

---

## What's DONE (the honest summary)

**~35 files functional across platform + admin + approver + operator + sysadmin + bot.** The infrastructure, auth, shells, bot, operator, and sysadmin are genuinely good. Approver engine is a real foundation.

## What's BUILT but STUBBED

**~25 files are scaffolds**: the 4 analytics scaffolds, `PassTypesForm` (5-field only), `DirectGenerateModal` (hardcoded union), `AllocationPanel` (always empty), `CampusDigitalTwin` (hardcoded zones), `admin/shared/PageHeader` (returns null), `StatCard` (placeholder modal), 4 empty files, 3 empty barrels.

## What's BUILT but DISPLAY-ONLY

**~80 files**: 18 student + 13 engagement + 12 approver role panels + 3 faculty + 4 parent + 7 mess + 9 retention + 6 person/dashboard + the 15 status bars + 12 command bars.

## What's DUPLICATED

**~60 files**: 15 status bars, 12 command bars, 6 ChartCards, 5 ConfirmDialogs, 5 WidgetBoundaries, 4 EmptyStates, 3 PageHeaders, 4 PassCreateForms, 11 LoadingStates, 2 HealthDashboards, 2 AuditLogViewers, 2 CsvValidationPreviews, 4 Sidebars.

## What's MISSING ENTIRELY (student focus)

1. Attendance page
2. Pass history page
3. Meal history / rating page
4. "My Records" aggregate page
5. Universal dispute flow
6. Persona-aware profile page (day scholar vs hosteller)
7. Outpass hosteller flow
8. Event RSVP / check-in / feedback
9. Actionable notifications
10. Parent consent flow
11. Personal goals progress view (linked to actual activity)
12. Calendar layers (classes, passes, meals, curfew, exams)
13. Faculty attendance marking + dispute inbox
14. Document verification status
15. Achievement proof links
16. Semester recap export
17. `usePersona()`, `usePassTypes()`, `useRoleCounts()`, `useDisputes()`, `useNotificationActions()`
18. `canAct()`, `nextActor()`, `deriveFlag()`, preference resolver
19. Trait layer (`trait_definitions`, `trait_overrides`)
20. Admin "PreviewAs" tool

---

## The ticket backlog (ordered by ROI)

| Priority | Item | Type | Effort |
|---|---|---|---|
| **P0** | Delete the 4 empty `admin/shared/*` files | cleanup | 5 min |
| **P0** | Delete 3 empty `admin/kit/*` barrels | cleanup | 5 min |
| **P0** | Move `DashboardCustomizer` from `engagement/` → `shared/` + mount on student home | new | 1 day |
| **P0** | Add RSVP button to `EventCard` + `POST /api/events/:id/rsvp` | new | 1 day |
| **P0** | Add tap-to-act to `RecentActivity` | new | 1 day |
| **P0** | Add inline actions to `NotificationCenter` | new | 2 days |
| **P1** | Build `student/AttendancePage` (new page) | new | 3 days |
| **P1** | Build `student/RecordsPage` (new page) | new | 2 days |
| **P1** | Universal `/api/disputes` + `useDisputes()` | new | 2 days |
| **P1** | Extend `PassTypesForm` to `PassTypeConfig` (persona + chain + quota + curfew) | rewrite | 3 days |
| **P1** | Add `usePersona()` + wire to student pages | new | 1 day |
| **P2** | Faculty `ClassRoster` — add mark-attendance + dispute inbox | new | 3 days |
| **P2** | `MessFoodPreference` → meal rating + history | extend | 2 days |
| **P2** | `DocumentUploadPanel` → add verification status | extend | 1 day |
| **P2** | Break 15 status bars into `useRoleCounts()` + thin shells | refactor | 3 days |
| **P2** | Break 12 command bars into `lib/commands/parse` + thin shells | refactor | 3 days |
| **P2** | Add `canAct()` + `nextActor()` kernel | new | 2 days |
| **P3** | Add trait layer (definitions + overrides) | new | 1 week |
| **P3** | Add "PreviewAs" admin tool | new | 2 days |
| **P3** | Collapse 5 duplicate families (ChartCard, ConfirmDialog, EmptyState, WidgetBoundary, PageHeader) | refactor | 1 week |
| **P3** | Delete the 4 scaffold analytics pages (replace with shared shell) | refactor | 3 days |

---

### One-line summary

> **Shipped & working:** platform (auth, shells, UI kit, bot, charts, cinematic), admin CRUD (announcements, exit reasons, support, SMS, users, audit), approver engine (commands, stage queue, bulk, escalation, digital sign), operator scan loop, sysadmin domain consoles, complaints, principal inbox. **~35 files real.**
> **Shipped but hollow:** ~25 scaffolds (4 analytics, PassTypesForm 5-field, DirectGenerateModal union, AllocationPanel dead branch, CampusDigitalTwin hardcoded, PageHeader null, StatCard placeholder, 4 empty + 3 barrels) — **~25 files.**
> **Shipped but display-only:** ~80 files, including **18 student + 13 engagement** — the exact area you want to focus on. **~80 files.**
> **Duplicated:** ~60 files (15 status bars, 12 command bars, 5 ConfirmDialogs, 5 WidgetBoundaries, 6 ChartCards, 4 forms).
> **Missing entirely:** 20 student-critical capabilities (attendance page, records page, dispute flow, event RSVP, actionable notifications, hosteller outpass, persona profile, faculty marking).
> **The single highest-ROI fix:** move `DashboardCustomizer` (already written, working, trapped) to student home + add RSVP to `EventCard` + tap-to-act on `RecentActivity` + inline actions on `NotificationCenter` — that's **4 changes that turn the read-only student app interactive without a single new page.**
