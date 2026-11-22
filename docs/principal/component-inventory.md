# Principal Experience — Component Inventory (live, 2026-11-22)

## Shell & navigation (reuse, do NOT rebuild)
| Component | File | State |
|---|---|---|
| PrincipalShell (PrincipalLayoutShell + PrincipalShell) | src/components/principal/shared/PrincipalShell.tsx | EXISTING — layout + titled shell |
| PrincipalDesktopShell | src/app/(approver)/principal/_shell/PrincipalDesktopShell.tsx | EXISTING |
| PrincipalMobileShell | src/app/(approver)/principal/_shell/PrincipalMobileShell.tsx | EXISTING |
| PrincipalSidebar / PrincipalSidebarCategory | src/components/principal/shared/ | EXISTING |
| PrincipalNotificationBell | src/app/(approver)/principal/_shell/ | EXISTING |
| PrincipalTopBar / PrincipalPageHeader | src/components/principal/shared/ | EXISTING |
| PrincipalWidgetBoundary | src/components/principal/shared/ | EXISTING — per-widget error boundary (reset key supported) |
| QuickActions | src/components/principal/shared/PrincipalQuickActions.tsx | EXISTING — role-aware (approver-gated) |

## Command palette (PR-13 base)
| Component | File | State |
|---|---|---|
| PrincipalCommandBar | src/components/approver/PrincipalCommandBar.tsx | EXISTING — 5-command nav palette (Dashboard/Delegations/Audit/Reports/Approvals); driven by src/components/approver/command-bars.manifest.ts + useRoleConsoleChrome |
| CommandBar (shared) | src/components/shared/CommandBar.tsx | EXISTING |
- Note: PR-13 upgrades PrincipalCommandBar to a *contextual* system. Preserve
  existing keyboard behaviour; the manifest + useRoleConsoleChrome are the
  integration points.

## Inspection family (PR-04 consolidation targets)
| Item | File | State |
|---|---|---|
| EntityInspector | src/components/shared/EntityInspector.tsx | EXISTING — the base inspector |
| useEntityInspector | src/components/shared/useEntityInspector.tsx | EXISTING |
| InspectOverlay | src/components/shared/InspectOverlay.tsx | EXISTING |
| inspectionModels | src/components/shared/inspectionModels.tsx | EXISTING — inspection data contracts |
| DetailSheet (principal) | src/app/(approver)/principal/_shared/DetailSheet.tsx | DUPLICATE — wraps PermissionDetailPanel |
| InboxDetailSheet | src/components/principal/inbox/InboxDetailSheet.tsx | DUPLICATE — also wraps PermissionDetailPanel |
| PermissionDetailPanel | src/components/approver/PermissionDetailPanel.tsx | SOURCE OF TRUTH for the decision/panel |
- **Duplication confirmed:** DetailSheet + InboxDetailSheet both import
  PermissionDetailPanel with near-identical wrappers. PR-04 must audit their
  behavioural differences, then consolidate onto one inspector. Do NOT merge
  blindly.
- **Reference inspection pattern:** /principal/cases/page.tsx already implements
  the 4-section model (Overview → Risk & Authority → Timeline → Actions) using
  EntityInspector + Timeline + actions. This is the pattern to generalize.

## Inbox / approvals
InboxCard, InboxList, InboxFilters, InboxBatchBar, InboxReviewPanel,
useInboxData (src/components/principal/inbox/). ApprovalsView + KpiCard/MiniStat/
WeekBar (src/app/(approver)/principal/_shared/).

## Retention widgets (evaluate per-utility, do not auto-display)
MorningBrief, EmergencyPulse, StrategicScorecard, FocusZone, FocusMode,
DelegationHealth, InsightCard, UpcomingPreview, WinFeed, StreakBadge,
ChainImpact, CelebrateOverlay (src/app/(approver)/principal/_retention/).
PR-12 should *reuse* the ones that genuinely serve executive decisions and
*not* render all of them for presence's sake.

## Primitives added this programme (Stage A/B1)
PulseTile, StoryChart, SectionHeader, SinceLastVisitCard
(src/components/principal/shared/). All compose existing shared components
(MiniSparkline, DeltaBadge, ChartRenderer, useApiResource, usePolling).

## Duplicated / unused (from the broader unslop baseline)
10 pre-existing unslop findings across 9 non-principal files (8 card-lasagna,
1 token-bypass in principal/emergency, 1 icon-size in admin/students).
See docs/plan/principal-frontend-transformation-TRACKER.md gate disposition.
