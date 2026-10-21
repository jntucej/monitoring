# Cookie-Cutter Fix Prompts — All Roles (Fix 2 → Fix 13)

Instantiated from the **# Cookie-Cutter Fix Prompt** template for each role in the
sequencing table. Fix 1 (Vice-Principal) was already instantiated in the source
prompt; this file covers Fixes 2–13.

> **Corrections applied vs. the raw template:**
> - `WidgetBoundary` prop is `title="…"` (not `label="…"` — the component reads `title`).
> - Import paths use the `@/` alias: `@/components/shared/WidgetBoundary`,
>   `@/components/shared/EmptyState`, `@/components/shared/LoadingStates`,
>   `@/components/shared/AuthGuard`.
> - Where a role has no `{{ROLE_PASCAL}}DashboardPanel` yet, the prompt tells the
>   implementer to stub it and list the gap in the Report.

---

## Sequencing & notes

Run fixes in order **2 → 13** (VP = Fix 1 already done). Each fix touches only
its own `page.tsx`, so they are independent. VP first because Phase 2 will create
the `/api/vice-principal/*` tree — the VP page is wired to the working (reused)
`/api/principal/dashboard` endpoint so it is never blocked on missing backend.

**Operator is intentionally excluded** — its console uses
`(operator)/gate/[gateId]` as the canonical desk with a distinct kiosk UX. It
should not be forced into the `RoleConsole` shell.

**Shared component reference** (verified in repo):
- `WidgetBoundary` — `@/components/shared/WidgetBoundary`, prop: `title`
- `EmptyState` — `@/components/shared/EmptyState`, props: `title`, `description`, `icon`, `action`, `className`
- `PageLoading` — `@/components/shared/LoadingStates`
- `AuthGuard` — `@/components/shared/AuthGuard`, prop: `allowedRoles: Role[]`
- `DevContactStrip` — `@/components/shared/DevContactStrip`
- Widgets: `AttentionQueue` (`@/components/engagement/AttentionQueue`),
  `ActivityTimeline` (`@/components/engagement/ActivityTimeline`),
  `PersonalizedCampusHome` / `TaskContinuity` / `UnifiedCampusCalendar`
  (`@/components/retention/*`), `QuickActions` / `NotificationCenter`
  (`@/components/shared/*`)

**Existing `{{ROLE_PASCAL}}DashboardPanel` components** (only these two exist —
all others must be stubbed):
- `VpDashboardPanel` (`src/components/approver/VpDashboardPanel.tsx`) — takes `onRefresh?`
- `PrincipalDashboardPanel` (`src/components/approver/PrincipalDashboardPanel.tsx`) — takes no props


---

## Fix 2: Wire the Principal dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `2` |
| `{{ROLE}}` | `principal` |
| `{{ROLE_DISPLAY}}` | `Principal` |
| `{{ROLE_PASCAL}}` | `Principal` |
| `{{ROLE_KEBAB}}` | `principal` |
| `{{PAGE_PATH}}` | `src/app/(approver)/principal/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"principal", "admin", "sysadmin"` |
| `{{STAGE}}` | `principal` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/principal/dashboard` |
| `{{EXTRA_ENDPOINTS}}` | `/api/analytics/daily-stats`, `/api/permissions?status=ESCALATED` |

````markdown
# Fix 2: Wire the Principal dashboard

## Context
You are extending the approver console for role **`principal`**.
The stub at `src/app/(approver)/principal/page.tsx` currently renders an empty
component. Replace it with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/PrincipalDashboardPanel.tsx` — existing Principal panel (takes no props)
- `src/components/approver/PrincipalStatusBar.tsx` — mounted by layout, do NOT render
- `src/components/approver/PrincipalCommandBar.tsx` — mounted by layout, do NOT render
- `src/app/(approver)/principal/_shared.tsx` — role-shared helpers (if present)
- `src/app/(approver)/principal/layout.tsx` — shell (do not modify)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["principal", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. No ad-hoc KPI `<div className="rounded-xl border …">`. Reuse `PrincipalDashboardPanel`
   (which already renders KPI tiles).
7. **Do NOT** render `PrincipalStatusBar` / `PrincipalCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them.
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Principal KPI">
  <PrincipalDashboardPanel />
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/principal/dashboard`
- Pending queue: `/api/permissions?status=PENDING&current_stage=principal`
- Extras: `/api/analytics/daily-stats`, `/api/permissions?status=ESCALATED`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/principal/page.tsx` renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/principal/page.tsx` rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````


## Fix 3: Wire the Deputy Warden dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `3` |
| `{{ROLE}}` | `deputy_warden` |
| `{{ROLE_DISPLAY}}` | `Deputy Warden` |
| `{{ROLE_PASCAL}}` | `DeputyWarden` |
| `{{ROLE_KEBAB}}` | `deputy-warden` |
| `{{PAGE_PATH}}` | `src/app/(approver)/deputy-warden/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"deputy_warden", "warden", "admin", "sysadmin"` |
| `{{STAGE}}` | `deputy_warden` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/deputy-warden/delegation` |
| `{{EXTRA_ENDPOINTS}}` | `/api/permissions?status=PENDING&current_stage=deputy_warden`, `/api/deputy-warden/incidents` |

> ⚠️ `DeputyWardenDashboardPanel` does **not** exist yet in `src/components/approver/`. Stub it per the template rule and list the gap.

````markdown
# Fix 3: Wire the Deputy Warden dashboard

## Context
You are extending the approver console for role **`deputy_warden`**.
The stub at `src/app/(approver)/deputy-warden/page.tsx` currently renders an
empty component. Replace it with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/DeputyWardenCommandBar.tsx` — mounted by layout, do NOT render
- `src/components/approver/DeputyWardenStatusBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/app/(approver)/deputy-warden/layout.tsx` — shell (do not modify)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["deputy_warden", "warden", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `DeputyWardenDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `DeputyWardenStatusBar` / `DeputyWardenCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them.
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Deputy Warden KPI">
  <DeputyWardenDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/deputy-warden/delegation`
- Pending queue: `/api/permissions?status=PENDING&current_stage=deputy_warden`
- Extras: `/api/deputy-warden/incidents`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/deputy-warden/page.tsx` renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/deputy-warden/page.tsx` rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 4: Wire the Hostel Manager dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `4` |
| `{{ROLE}}` | `hostel_manager` |
| `{{ROLE_DISPLAY}}` | `Hostel Manager` |
| `{{ROLE_PASCAL}}` | `HostelManager` |
| `{{ROLE_KEBAB}}` | `hostel-manager` |
| `{{PAGE_PATH}}` | `src/app/(approver)/hostel-manager/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"hostel_manager", "admin", "sysadmin"` |
| `{{STAGE}}` | `hostel_manager` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/hostel-manager/summary` |
| `{{EXTRA_ENDPOINTS}}` | `/api/hostel/tickets`, `/api/hostel/rooms` |

> ⚠️ `HostelManagerDashboardPanel` does **not** exist yet. Stub it and list the gap.

````markdown
# Fix 4: Wire the Hostel Manager dashboard

## Context
You are extending the approver console for role **`hostel_manager`**.
The stub at `src/app/(approver)/hostel-manager/page.tsx` currently renders an
empty component. Replace it with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/HostelManagerCommandBar.tsx` — mounted by layout, do NOT render
- `src/components/approver/HostelManagerStatusBar.tsx` — mounted by layout, do NOT render
- `src/app/(approver)/hostel-manager/layout.tsx` — shell (do not modify)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["hostel_manager", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `HostelManagerDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `HostelManagerStatusBar` / `HostelManagerCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them.
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Hostel Manager KPI">
  <HostelManagerDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/hostel-manager/summary`
- Pending queue: `/api/permissions?status=PENDING&current_stage=hostel_manager`
- Extras: `/api/hostel/tickets`, `/api/hostel/rooms`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/hostel-manager/page.tsx` renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/hostel-manager/page.tsx` rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 5: Wire the Supervisor dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `5` |
| `{{ROLE}}` | `supervisor` |
| `{{ROLE_DISPLAY}}` | `Supervisor` |
| `{{ROLE_PASCAL}}` | `Supervisor` |
| `{{ROLE_KEBAB}}` | `supervisor` |
| `{{PAGE_PATH}}` | `src/app/(approver)/supervisor/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"supervisor", "admin", "sysadmin"` |
| `{{STAGE}}` | `supervisor` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/supervisor/escalations` |
| `{{EXTRA_ENDPOINTS}}` | `/api/supervisor/queue`, `/api/supervisor/escalated` |

> ⚠️ `src/app/(approver)/supervisor/` directory does **not** exist yet — create the page stub first.
> `SupervisorDashboardPanel` does **not** exist — stub it and list the gap.

````markdown
# Fix 5: Wire the Supervisor dashboard

## Context
You are extending the approver console for role **`supervisor`**.
Create `src/app/(approver)/supervisor/page.tsx` (the directory does not exist yet)
and replace the empty stub with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/SupervisorCommandBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/components/approver/SupervisorStatusBar.tsx` — mounted by layout, do NOT render (verify exists)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["supervisor", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `SupervisorDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `SupervisorStatusBar` / `SupervisorCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them.
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Supervisor KPI">
  <SupervisorDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/supervisor/escalations`
- Pending queue: `/api/permissions?status=PENDING&current_stage=supervisor`
- Extras: `/api/supervisor/queue`, `/api/supervisor/escalated`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/supervisor/page.tsx` created and renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/supervisor/page.tsx` created/rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 6: Wire the HOD dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `6` |
| `{{ROLE}}` | `hod` |
| `{{ROLE_DISPLAY}}` | `HOD` |
| `{{ROLE_PASCAL}}` | `Hod` |
| `{{ROLE_KEBAB}}` | `hod` |
| `{{PAGE_PATH}}` | `src/app/(approver)/hod/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"hod", "admin", "sysadmin"` |
| `{{STAGE}}` | `hod` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/hod/faculty` |
| `{{EXTRA_ENDPOINTS}}` | `/api/hod/department`, `/api/hod/attendance-exceptions` |

> ⚠️ `HodDashboardPanel` does **not** exist yet. Stub it and list the gap.

````markdown
# Fix 6: Wire the HOD dashboard

## Context
You are extending the approver console for role **`hod`**.
The stub at `src/app/(approver)/hod/page.tsx` currently renders an empty
component. Replace it with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/app/(approver)/hod/layout.tsx` — shell (do not modify)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["hod", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `HodDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `HodStatusBar` / `HodCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them (verify they exist).
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="HOD KPI">
  <HodDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/hod/faculty`
- Pending queue: `/api/permissions?status=PENDING&current_stage=hod`
- Extras: `/api/hod/department`, `/api/hod/attendance-exceptions`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/hod/page.tsx` renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/hod/page.tsx` rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 7: Wire the OIE dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `7` |
| `{{ROLE}}` | `oie` |
| `{{ROLE_DISPLAY}}` | `OIE` |
| `{{ROLE_PASCAL}}` | `Oie` |
| `{{ROLE_KEBAB}}` | `oie` |
| `{{PAGE_PATH}}` | `src/app/(approver)/oie/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"oie", "exam_superintendent", "principal", "admin", "sysadmin"` |
| `{{STAGE}}` | `oie` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/oie/queue` |
| `{{EXTRA_ENDPOINTS}}` | `/api/oie/exam-day`, `/api/oie/access-exceptions` |

> ⚠️ `OieDashboardPanel` does **not** exist yet. Stub it and list the gap.

````markdown
# Fix 7: Wire the OIE dashboard

## Context
You are extending the approver console for role **`oie`**.
The stub at `src/app/(approver)/oie/page.tsx` currently renders an empty
component. Replace it with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/OieCommandBar.tsx` — mounted by layout, do NOT render
- `src/components/approver/OieStatusBar.tsx` — mounted by layout, do NOT render
- `src/app/(approver)/oie/layout.tsx` — shell (do not modify)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["oie", "exam_superintendent", "principal", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `OieDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `OieStatusBar` / `OieCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them.
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="OIE KPI">
  <OieDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/oie/queue`
- Pending queue: `/api/permissions?status=PENDING&current_stage=oie`
- Extras: `/api/oie/exam-day`, `/api/oie/access-exceptions`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/oie/page.tsx` renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/oie/page.tsx` rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 8: Wire the Staff dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `8` |
| `{{ROLE}}` | `staff` |
| `{{ROLE_DISPLAY}}` | `Staff` |
| `{{ROLE_PASCAL}}` | `Staff` |
| `{{ROLE_KEBAB}}` | `staff` |
| `{{PAGE_PATH}}` | `src/app/(approver)/staff/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"staff", "admin", "sysadmin"` |
| `{{STAGE}}` | `staff` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/staff/my-day` |
| `{{EXTRA_ENDPOINTS}}` | `/api/staff/tasks`, `/api/staff/leaves` |

> ⚠️ `StaffDashboardPanel` does **not** exist yet. Stub it and list the gap.

````markdown
# Fix 8: Wire the Staff dashboard

## Context
You are extending the approver console for role **`staff`**.
The stub at `src/app/(approver)/staff/page.tsx` currently renders an empty
component. Replace it with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/StaffStatusBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/app/(approver)/staff/layout.tsx` — shell (do not modify)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["staff", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `StaffDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `StaffStatusBar` / `StaffCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them (verify they exist).
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Staff KPI">
  <StaffDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/staff/my-day`
- Pending queue: `/api/permissions?status=PENDING&current_stage=staff`
- Extras: `/api/staff/tasks`, `/api/staff/leaves`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/staff/page.tsx` renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/staff/page.tsx` rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 9: Wire the Mess Incharge dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `9` |
| `{{ROLE}}` | `mess_incharge` |
| `{{ROLE_DISPLAY}}` | `Mess Incharge` |
| `{{ROLE_PASCAL}}` | `MessIncharge` |
| `{{ROLE_KEBAB}}` | `mess-incharge` |
| `{{PAGE_PATH}}` | `src/app/(approver)/mess-incharge/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"mess_incharge", "admin", "sysadmin"` |
| `{{STAGE}}` | `mess_incharge` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/mess/analytics` |
| `{{EXTRA_ENDPOINTS}}` | `/api/mess/menu`, `/api/mess/special-events` |

> ⚠️ `src/app/(approver)/mess-incharge/` directory does **not** exist yet — create the page stub first.
> `MessInchargeDashboardPanel` does **not** exist — stub it and list the gap.

````markdown
# Fix 9: Wire the Mess Incharge dashboard

## Context
You are extending the approver console for role **`mess_incharge`**.
Create `src/app/(approver)/mess-incharge/page.tsx` (the directory does not exist yet)
and replace the empty stub with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/MessInchargeCommandBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/components/approver/MessInchargeStatusBar.tsx` — mounted by layout, do NOT render (verify exists)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["mess_incharge", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `MessInchargeDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `MessInchargeStatusBar` / `MessInchargeCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them (verify they exist).
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Mess Incharge KPI">
  <MessInchargeDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/mess/analytics`
- Pending queue: `/api/permissions?status=PENDING&current_stage=mess_incharge`
- Extras: `/api/mess/menu`, `/api/mess/special-events`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/mess-incharge/page.tsx` created and renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/mess-incharge/page.tsx` created/rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 10: Wire the Exam Superintendent dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `10` |
| `{{ROLE}}` | `exam_superintendent` |
| `{{ROLE_DISPLAY}}` | `Exam Superintendent` |
| `{{ROLE_PASCAL}}` | `ExamSuperintendent` |
| `{{ROLE_KEBAB}}` | `exam-superintendent` |
| `{{PAGE_PATH}}` | `src/app/(approver)/exam-superintendent/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"exam_superintendent", "oie", "admin", "sysadmin"` |
| `{{STAGE}}` | `exam_superintendent` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/exam/superintendent` |
| `{{EXTRA_ENDPOINTS}}` | `/api/exam/schedule`, `/api/exam/halls` |

> ⚠️ `src/app/(approver)/exam-superintendent/` directory does **not** exist yet — create the page stub first.
> `ExamSuperintendentDashboardPanel` does **not** exist — stub it and list the gap.

````markdown
# Fix 10: Wire the Exam Superintendent dashboard

## Context
You are extending the approver console for role **`exam_superintendent`**.
Create `src/app/(approver)/exam-superintendent/page.tsx` (the directory does not exist yet)
and replace the empty stub with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/ExamSuperintendentCommandBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/components/approver/ExamSuperintendentStatusBar.tsx` — mounted by layout, do NOT render (verify exists)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["exam_superintendent", "oie", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `ExamSuperintendentDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `ExamSuperintendentStatusBar` / `ExamSuperintendentCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them (verify they exist).
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Exam Superintendent KPI">
  <ExamSuperintendentDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/exam/superintendent`
- Pending queue: `/api/permissions?status=PENDING&current_stage=exam_superintendent`
- Extras: `/api/exam/schedule`, `/api/exam/halls`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/exam-superintendent/page.tsx` created and renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/exam-superintendent/page.tsx` created/rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 11: Wire the Exam Branch dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `11` |
| `{{ROLE}}` | `exam_branch` |
| `{{ROLE_DISPLAY}}` | `Exam Branch` |
| `{{ROLE_PASCAL}}` | `ExamBranch` |
| `{{ROLE_KEBAB}}` | `exam-branch` |
| `{{PAGE_PATH}}` | `src/app/(approver)/exam-branch/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"exam_branch", "admin", "sysadmin"` |
| `{{STAGE}}` | `exam_branch` |
| `{{DASHBOARD_ENDPOINT}}` | *(missing — stub + report)* |
| `{{EXTRA_ENDPOINTS}}` | `/api/exam/branch/queue`, `/api/exam/branch/results` |

> ⚠️ `src/app/(approver)/exam-branch/` directory does **not** exist yet — create the page stub first.
> Dashboard endpoint is missing — stub the panel and list the gap. `ExamBranchDashboardPanel` does **not** exist.

````markdown
# Fix 11: Wire the Exam Branch dashboard

## Context
You are extending the approver console for role **`exam_branch`**.
Create `src/app/(approver)/exam-branch/page.tsx` (the directory does not exist yet)
and replace the empty stub with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/ExamBranchCommandBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/components/approver/ExamBranchStatusBar.tsx` — mounted by layout, do NOT render (verify exists)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["exam_branch", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. Dashboard endpoint is **missing** — stub the KPI panel inside a `WidgetBoundary`
   and list the gap in the Report. Do not invent a new API in this fix.
7. **Do NOT** render `ExamBranchStatusBar` / `ExamBranchCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them (verify they exist).
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Exam Branch KPI">
  <ExamBranchDashboardPanel />   // stub — endpoint missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: *(missing — stub + report)*
- Pending queue: `/api/permissions?status=PENDING&current_stage=exam_branch`
- Extras: `/api/exam/branch/queue`, `/api/exam/branch/results`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/exam-branch/page.tsx` created and renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists the missing dashboard endpoint so backend can follow up.

## Output
1. One diff: `src/app/(approver)/exam-branch/page.tsx` created/rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 12: Wire the Parent dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `12` |
| `{{ROLE}}` | `parent` |
| `{{ROLE_DISPLAY}}` | `Parent` |
| `{{ROLE_PASCAL}}` | `Parent` |
| `{{ROLE_KEBAB}}` | `parent` |
| `{{PAGE_PATH}}` | `src/app/(approver)/parent/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"parent", "guardian", "admin", "sysadmin"` |
| `{{STAGE}}` | `parent` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/parents/me` |
| `{{EXTRA_ENDPOINTS}}` | `/api/parents/wards`, `/api/parents/notifications` |

> ⚠️ `src/app/(approver)/parent/` directory does **not** exist yet — create the page stub first.
> `ParentDashboardPanel` does **not** exist — stub it and list the gap.

````markdown
# Fix 12: Wire the Parent dashboard

## Context
You are extending the approver console for role **`parent`**.
Create `src/app/(approver)/parent/page.tsx` (the directory does not exist yet)
and replace the empty stub with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/ParentCommandBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/components/approver/ParentStatusBar.tsx` — mounted by layout, do NOT render (verify exists)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["parent", "guardian", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `ParentDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `ParentStatusBar` / `ParentCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them (verify they exist).
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Parent KPI">
  <ParentDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/parents/me`
- Pending queue: `/api/permissions?status=PENDING&current_stage=parent`
- Extras: `/api/parents/wards`, `/api/parents/notifications`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/parent/page.tsx` created and renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/parent/page.tsx` created/rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---

## Fix 13: Wire the Worker dashboard

| Placeholder | Value |
|---|---|
| `{{N}}` | `13` |
| `{{ROLE}}` | `worker` |
| `{{ROLE_DISPLAY}}` | `Worker` |
| `{{ROLE_PASCAL}}` | `Worker` |
| `{{ROLE_KEBAB}}` | `worker` |
| `{{PAGE_PATH}}` | `src/app/(approver)/worker/page.tsx` |
| `{{ALLOWED_ROLES}}` | `"worker", "admin", "sysadmin"` |
| `{{STAGE}}` | `worker` |
| `{{DASHBOARD_ENDPOINT}}` | `/api/workers/my-work` |
| `{{EXTRA_ENDPOINTS}}` | `/api/workers/tasks`, `/api/workers/attendance` |

> ⚠️ `src/app/(approver)/worker/` directory does **not** exist yet — create the page stub first.
> `WorkerDashboardPanel` does **not** exist — stub it and list the gap.

````markdown
# Fix 13: Wire the Worker dashboard

## Context
You are extending the approver console for role **`worker`**.
Create `src/app/(approver)/worker/page.tsx` (the directory does not exist yet)
and replace the empty stub with a fully-wired dashboard that matches:

- The **sysadmin philosophy** (`src/app/(sysadmin)/sysadmin/page.tsx`)
- The **guardian reference dashboard** (`src/app/(approver)/guardian/page.tsx`)

## Read these first (do not guess)
- `src/app/(approver)/guardian/page.tsx` — canonical approver dashboard
- `src/app/(approver)/guardian/layout.tsx` — shell pattern
- `src/app/(sysadmin)/sysadmin/page.tsx` — reference philosophy
- `src/components/approver/WorkerCommandBar.tsx` — mounted by layout, do NOT render (verify exists)
- `src/components/approver/WorkerStatusBar.tsx` — mounted by layout, do NOT render (verify exists)

## Hard constraints (non-negotiable)
1. Wrap the whole tree in `AuthGuard allowedRoles={["worker", "admin", "sysadmin"]}`.
2. `Suspense fallback={<PageLoading />}` around the outer boundary.
3. Every data panel wrapped in `<WidgetBoundary title="…">` from **`'@/components/shared/WidgetBoundary'`**.
4. Fetch with `useApiResource<T>()` + `usePolling(refresh, { intervalMs: 30_000 })`.
   **Never** re-implement `fetch`/`getAuthHeaders` inline.
5. Loading → `<Skeleton />`. Empty → `<EmptyState />` from **`'@/components/shared/EmptyState'`**.
   No inline `function EmptyState()` helpers.
6. If `WorkerDashboardPanel` exists, reuse it for KPI tiles. Otherwise
   stub the panel inside a `WidgetBoundary` and list the gap in the Report.
7. **Do NOT** render `WorkerStatusBar` / `WorkerCommandBar` — the
   `layout.tsx` → `RoleConsole` already mounts them (verify they exist).
8. Keep imports alphabetised within groups. Add **no** new npm dependencies.

## Page structure (in order)
```
<DevContactStrip />
<WidgetBoundary title="Worker KPI">
  <WorkerDashboardPanel />   // stub if missing
</WidgetBoundary>
<WidgetBoundary title="Attention queue">
  <AttentionQueue />
</WidgetBoundary>
<WidgetBoundary title="Personalised home">
  <PersonalizedCampusHome />
</WidgetBoundary>
<WidgetBoundary title="Task continuity">
  <TaskContinuity />
</WidgetBoundary>
<WidgetBoundary title="Unified calendar">
  <UnifiedCampusCalendar />
</WidgetBoundary>
<WidgetBoundary title="Activity timeline">
  <ActivityTimeline />
</WidgetBoundary>
<WidgetBoundary title="Quick actions">
  <QuickActions />
</WidgetBoundary>
<WidgetBoundary title="Notifications">
  <NotificationCenter />
</WidgetBoundary>
```

## Data (verify endpoint exists; report if missing)
- Dashboard KPIs: `/api/workers/my-work`
- Pending queue: `/api/permissions?status=PENDING&current_stage=worker`
- Extras: `/api/workers/tasks`, `/api/workers/attendance`

If an endpoint 404s or does not exist, **stub the panel** and list the gap
in the Report — do not invent a new API in this fix.

## Definition of Done
- [ ] `src/app/(approver)/worker/page.tsx` created and renders a dashboard (not an empty function body).
- [ ] `npx tsc --noEmit` passes.
- [ ] Every visible widget has loading / empty / error states.
- [ ] Visual parity with `/guardian` (spacing, `WidgetBoundary` titles, section order).
- [ ] No new inline copies of `EmptyState`, `StatusBar`, `CommandBar`, `KpiTile`.
- [ ] Report lists any endpoint that was missing so backend can follow up.

## Output
1. One diff: `src/app/(approver)/worker/page.tsx` created/rewritten.
2. A short **Report** section listing:
   - Endpoints verified (✅)
   - Endpoints missing (⚠️ — path + expected shape)
   - Follow-ups for the next fix
````

---
---
---