# UI Components Not Wired to Any Page

Components that exist in `src/components/` but have **zero importers** anywhere in the codebase — they are built but not connected to a page. These are the 'connect UI to pages' backlog.

**Total: 95 unwired components** (detected by 0 importers across all of `src/`).

> Note: some are intentional reusable primitives (e.g. `ui/*`, `charts/*`) not yet mounted; others are dead/duplicate files that should be deleted. This list drives both 'wire it' and 'delete it' decisions.


## `sysadmin` — 34

- `sysadmin/ConductPolicies.tsx`
- `sysadmin/GateManagement.tsx`
- `sysadmin/PromotionRequests.tsx`
- `sysadmin/SchedulingPanel.tsx`
- `sysadmin/SysAdminControlPanel.tsx`
- `sysadmin/SystemSettings.tsx`
- `sysadmin/domains/access/AccessContent.tsx`
- `sysadmin/domains/access/AccessDrawer.tsx`
- `sysadmin/domains/alerts/AlertsDrawer.tsx`
- `sysadmin/domains/alerts/SafetyDrawer.tsx`
- `sysadmin/domains/automation/DeploymentsDrawer.tsx`
- `sysadmin/domains/automation/JobsDrawer.tsx`
- `sysadmin/domains/automation/MaintenanceDrawer.tsx`
- `sysadmin/domains/data/DataContent.tsx`
- `sysadmin/domains/data/DataDrawer.tsx`
- `sysadmin/domains/gates/DevicesContent.tsx`
- `sysadmin/domains/gates/DevicesDrawer.tsx`
- `sysadmin/domains/gates/GatesContent.tsx`
- `sysadmin/domains/gates/GatesDrawer.tsx`
- `sysadmin/domains/governance/AuditContent.tsx`
- `sysadmin/domains/governance/AuditDrawer.tsx`
- `sysadmin/domains/governance/ComplianceDrawer.tsx`
- `sysadmin/domains/identity/PromotionsDrawer.tsx`
- `sysadmin/domains/monitoring/HealthDrawer.tsx`
- `sysadmin/domains/platform/IntegrationsContent.tsx`
- `sysadmin/domains/platform/IntegrationsDrawer.tsx`
- `sysadmin/domains/platform/ReasonsContent.tsx`
- `sysadmin/domains/platform/ReasonsDrawer.tsx`
- `sysadmin/domains/platform/SystemContent.tsx`
- `sysadmin/domains/platform/SystemDrawer.tsx`
- `sysadmin/domains/reference/DepartmentsContent.tsx`
- `sysadmin/domains/reference/DepartmentsDrawer.tsx`
- `sysadmin/domains/reference/HostelTicketsContent.tsx`
- `sysadmin/domains/reference/HostelTicketsDrawer.tsx`

## `shared` — 21

- `shared/AnnouncementBanner.tsx`
- `shared/ApprovalInbox.tsx`
- `shared/ConditionalAlert.tsx`
- `shared/ConductLedger.tsx`
- `shared/ElasticPill.tsx`
- `shared/EmergencyPlaybook.tsx`
- `shared/FeedbackModal.tsx`
- `shared/GlassMeter.tsx`
- `shared/GlassParticles.tsx`
- `shared/HumanPulseDot/HumanPulseDot.tsx`
- `shared/LiveActivityFeed.tsx`
- `shared/MobileLabel.tsx`
- `shared/MyTicketsPanel.tsx`
- `shared/PasswordRules.tsx`
- `shared/RoleGate.tsx`
- `shared/RoleHierarchyGraph.tsx`
- `shared/StepUpModal.tsx`
- `shared/UniversalSupportForm.tsx`
- `shared/attendance/AttendanceSummaryCards.tsx`
- `shared/complaints/EscalateComplaintButton.tsx`
- `shared/complaints/ResolutionRating.tsx`

## `principal` — 11

- `principal/_components/AuditRecords.tsx`
- `principal/_components/DecisionCard.tsx`
- `principal/_components/HostelPanels.tsx`
- `principal/_components/RetentionWidgets.tsx`
- `principal/delegation/DelegationForm.tsx`
- `principal/hostels/HostelActivityFeed.tsx`
- `principal/hostels/HostelComplaintList.tsx`
- `principal/hostels/HostelCurfew.tsx`
- `principal/inbox/InboxList.tsx`
- `principal/shared/PrincipalConfirm.tsx`
- `principal/shared/PrincipalShell.tsx`

## `operator` — 7

- `operator/BreakdownPanel.tsx`
- `operator/OutingPanel.tsx`
- `operator/ScanViewfinder.tsx`
- `operator/camera/OperatorCamera.tsx`
- `operator/camera/SnapSuccess.tsx`
- `operator/shared/OperatorStatusBadge.tsx`
- `operator/sheet/ManualEntrySheet.tsx`

## `admin` — 5

- `admin/FlagManager.tsx`
- `admin/GateCardsGrid.tsx`
- `admin/PersonList.tsx`
- `admin/StaffTracking.tsx`
- `admin/WebhooksAnalytics.tsx`

## `approver` — 4

- `approver/AcademicsDepartmentPanel.tsx`
- `approver/LiveActivityPanel.tsx`
- `approver/OieQueuePanel.tsx`
- `approver/TodayMealsPanel.tsx`

## `person` — 3

- `person/AccessRestrictions.tsx`
- `person/EmployeeStats.tsx`
- `person/WorkerStats.tsx`

## `student` — 2

- `student/MessFoodPreference.tsx`
- `student/ProfilePageV2.tsx`

## `dashboard` — 2

- `dashboard/HostelDashboard.tsx`
- `dashboard/dashboard-shared.tsx`

## `RoleLoading.tsx` — 1

- `RoleLoading.tsx`

## `mess` — 1

- `mess/HostelOnlyGate.tsx`

## `parent` — 1

- `parent/ChildPassStatusCard.tsx`

## `RoleEmptyState.tsx` — 1

- `RoleEmptyState.tsx`

## `remotion` — 1

- `remotion/GlossyMotionPlayer.tsx`

## `RoleError.tsx` — 1

- `RoleError.tsx`