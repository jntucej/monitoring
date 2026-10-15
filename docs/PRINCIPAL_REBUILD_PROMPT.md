# Principal Dashboard Rebuild Prompt

Reusable orchestration prompt for principal page refactors.

## Prompt (copy-paste)

```
Rebuild (approver)/principal/** into N surfaces with one goal: shrink
time-to-first-decision and raise delegation rate.

Rules:
  1. One screen answers "What needs me now?" — everything else is one
     click behind a why.
  2. Every number = Now + vs last week + what to do.
  3. Every approval card offers inline Delegate.
  4. Collapse pages → surfaces. Redirect every old URL.
  5. Visual: light, high-contrast, 2 accents (emerald + rose),
     gap-8 rhythm, no glass effects, no icon on every KPI.
  6. Add 3 retention layers: Since-Last-Visit, Weekly Digest,
     Emergency Playbook drawer.
```

## Delivery Order

1. `_shared.tsx` — 7 primitives (PrincipalShell, PulseTile, StoryChart, DecisionCard, SectionHeader, SinceLastVisitCard, PageLoading)
2. `page.tsx` — Command Center
3. `approvals/page.tsx` — Tabbed approvals
4. `PrincipalDigest.tsx` — Retention widget
5. `EmergencyPlaybook.tsx` — Retention drawer
6. `next.config.mjs` — Redirect map

## Constraints

- Reuse: `useApiResource`, `usePolling`, `WidgetBoundary`, `EmptyState`, `getAuthHeaders`, `getRoleTier`, `formatDateTime`
- No new deps
- No file > 400 lines
- Preserve existing `_shared.tsx` exports used by other principal sub-pages

## Backend Follow-ups (TODO)

- `/api/principal/dashboard` → return `{ headline, onCampusNow, todayIn, todayOut, activeAlerts, *Delta, *Spark }`
- `/api/principal/audit?summary=1&since=…` → return `{ approvals_cleared, emergencies, new_incidents, delegations }`
- `/api/principal/digest?range=week` → return `{ approved, delegated, avgDecision, slaAdherence, insight }`
