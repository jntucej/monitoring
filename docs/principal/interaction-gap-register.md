# Principal Experience — Interaction Gap Register (verified, 2026-11-22)

Each row: observed location → intent → current behaviour → problem →
recommendation. Only VERIFIED observations (read from live code / run the UI).
No speculative redesigns.

| # | Location | User intent | Current behaviour | Backend | Problem | Recommendation |
|---|---|---|---|---|---|---|
| G1 | /principal (page.tsx) | "what needs me now" | Was a 7-line stub showing only ApprovalsView (now the new Command Center, Stage B1) | /api/principal/dashboard | The landing was not decision-first; KPIs lacked now+vs-last-week+what-to-do | Reuse Command Center (done in Stage B1); add *Delta*/*Spark* via dashboard follow-up (PR-12) |
| G2 | /principal/approvals + 4 sub-URLs | filter approvals | 4 separate routes (pending/escalated/overdue/delegated) + parent | permissions API | Page sprawl; repeated navigation | PR-05: tabbed approvals in /principal/approvals + redirect map (PR-B2/C) |
| G3 | DetailSheet vs InboxDetailSheet | inspect a permission | Two near-identical wrappers both render PermissionDetailPanel | permissions | Duplication + drift risk | PR-04: consolidate onto one inspector; audit behavioural diffs first |
| G4 | /principal/emergency (line 9) | show emergency state | STATE_COLOR uses raw bg-emerald/amber/orange/red-500 classes | /api/principal/emergency | token-bypass (unslop finding) | PR-05: switch to action/mint tokens |
| G5 | EntityInspector vs cases 4-section | inspect an entity | cases/page.tsx hand-builds Overview→Risk&Authority→Timeline→Actions on EntityInspector; other surfaces don't share it | inspectionModels | No unified inspection; per-domain re-implementation | PR-04: composable InspectorHeader/Overview/Status/Relationships/Timeline/Actions/Footer |
| G6 | Command Centre KPIs | understand a number | Static numbers | dashboard | No drill-down destination, no "what to do" | PR-05: KPI→filtered records; PR-12 follow-up adds delta/spark |
| G7 | PrincipalCommandBar | jump across console | 5 fixed nav commands | command-bars.manifest | Not contextual | PR-13: contextual commands, preserve keyboard behaviour |
| G8 | Action buttons (approvals/cases) | act | click fires route but outcome not verified | engine routes | No execution lifecycle (submit/processing/verify/audit) | PR-10/11: Execution Monitor + post-action revalidation + audit link |
| G9 | Timeline | see history | cases uses shared Timeline; no cross-entity timeline | attention/timeline API | Inconsistent; no lazy loading for long histories | PR-06: reusable entity-activity timeline (loading/empty/paginated) |
| G10 | Relationships | "what's connected" | ad-hoc related-record links | per-domain APIs | No consistent related-records section; N+1 risk | PR-07: related-entities section, permission-aware, no invented edges |

## State-handling audit (loading/empty/stale/error)
- WidgetBoundary: PrincipalWidgetBoundary gives per-widget isolation (reset key
  supported). Reuse, don't build a second boundary.
- Loading: PrincipalLoading/PrincipalLoadingStates exist; the new CC uses a
  simple "Loading your desk…" placeholder — acceptable for the shell, refine in
  PR-12.
- Stale: useApiResource caches with ttlMs; Command Center polls every 60s.
  "last updated" indicator is not yet shown — PR-12 (interface must explain
  its state: live/cached/stale).
- Error: PrincipalEmptyState + WidgetBoundary catch. Verified no new dead state.

## Auth / RBAC boundary
- Console shell + AuthGuard enforce principal/approver access; every API
  re-checks requiredRole server-side. RLS scopes gate_app row visibility.
- No client-side grant: buttons render but the route is authoritative.
  Preserve this in every PR.
