# Principal Experience — Experience Audit (summary, 2026-11-22)

This is PR-01's synthesis. Detailed inventories live in the sibling docs
(route-inventory, component-inventory, api-and-permission-map,
interaction-gap-register). Facts below are verified against the live tree.

## What already exists (verified, reused not rebuilt)
- **Shell/nav:** PrincipalDesktopShell, PrincipalMobileShell, PrincipalSidebar,
  PrincipalNotificationBell, PrincipalTopBar/PageHeader, PrincipalWidgetBoundary,
  QuickActions. Do NOT build a new shell.
- **Command palette:** PrincipalCommandBar (5-command nav) + command-bars.manifest
  + useRoleConsoleChrome. Upgrade in place (PR-13).
- **Inspection:** EntityInspector, useEntityInspector, InspectOverlay,
  inspectionModels + a proven 4-section pattern in /principal/cases
  (Overview → Risk & Authority → Timeline → Actions).
- **Inbox:** InboxCard/List/Filters/BatchBar/ReviewPanel/useInboxData;
  DetailSheet + InboxDetailSheet (both wrap PermissionDetailPanel — duplicated).
- **Retention:** 12 widgets (MorningBrief, EmergencyPulse, StrategicScorecard,
  FocusZone/Mode, DelegationHealth, InsightCard, UpcomingPreview, WinFeed,
  StreakBadge, ChainImpact, CelebrateOverlay). Reuse only those that serve
  executive decisions.
- **PR-12 engines already shipped (the 22-commit pull):** /api/principal
  attention/decisions/escalations/emergency + their pages; institutional
  workflow/authority/escalation/decision/impact/SoD engines.
- **This programme's Stage A/B1 (done, branch c63dfec5):** /principal Command
  Center + 3 primitives (PulseTile, StoryChart, SectionHeader, SinceLastVisitCard).

## What the transformation changes (verified gaps → PRs)
1. **Decision-first landing** (G1) → PR-12 Executive Command Centre (expand B1:
   institutional health, attention queue, emergency pulse, operational health,
   delegation health, live activity, upcoming, strategic metrics — each with
   real source + drill-down).
2. **Collapsing approvals** (G2) → PR-05 tabbed approvals + PR-B2/C redirect map.
3. **One inspection experience** (G3,G5) → PR-04 unify onto EntityInspector;
   consolidate DetailSheet/InboxDetailSheet.
4. **Context-preserving workspace** → PR-03 workspace state + return-to-origin
   (URL params for shareable context; local state for transient).
5. **Real action consequences** (G8) → PR-10 Execution Monitor + PR-11
   post-action revalidation/audit; lifecycle Understand→…→Audit, no fake success.
6. **History + relationships** (G9,G10) → PR-06 entity timeline + PR-07
   relationship exploration (verified data only, permission-aware).
7. **Investigation workspace** → PR-08 (overview/relationships/history/evidence
   together, progressive disclosure).
8. **Decision workspace** → PR-09 unify approval detail (reuse
   PermissionDetailPanel; server-authoritative; batch reports partial success).
9. **Contextual command system** (G7) → PR-13.
10. **Shared contracts** (PR-02) → entity refs, inspection, workspace context,
    relationship/timeline/action/execution state; ADR; type-level validation.

## Hard invariants (from the doc, enforced every PR)
- Preserve existing routes, auth, RBAC, API contracts, domain behaviour unless
  an approved PR changes them.
- No new framework / no duplicate domain models / no second global-state.
- Server is authoritative; UI shows why an action is unavailable.
- Never fabricate relationships, timelines, deltas, or success states.
- No glassmorphism / decorative cards / fake live indicators / meaningless charts.
- chief_warden = role context, not an account; follow institutional policy.

## Verification standard per PR
tsc --noEmit + eslint (0 new findings) + relevant unit tests + next build +
browser UI inspection (desktop+mobile) + failure/permission scenarios +
evidence (screenshots) + rollback notes. A green build alone is NOT completion.
