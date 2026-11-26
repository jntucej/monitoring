# Gate Monitor — UI Architecture

## 1. Navigation & Shell Model
- **Role-scoped route groups:** `(admin)`, `(approver)`, `(student)`, `(operator)`, `(supervisor)`, `(mess)`, `(sysadmin)`, `(person)`.
- **Role personalization:** `src/config/roles/<role>.ts` + `RoleThemeProvider` (`--role-accent`, `--role-tint`, `--role-radius`, `data-motion`).
- **Entity inspection:** `src/components/shared/entityResolvers.tsx` + `DetailSheet` / `InspectorButton` provide cross-entity drill-down without losing list context.

## 2. Shared Interaction Patterns
- **KPI Drill-Downs:** `KpiCard` (`drilldown={{ label, href }}` / `onClick`) and `StatCard` (`href` / `<Link>` wrapper) enforce that summary metrics navigate to filtered registers or open contextual inspectors.
- **Security & API Chain:** All 798 API routes use `withApiChain` / `withAuthorization` / `withRateLimit` with U6 structured `http.request` logging and U8/U8.1 streamed body-size enforcement (`1 MB` JSON / `25 MB` multipart).
- **Accessibility:** Semantic `<Link>` / `<button>` controls, `focus-visible:ring-2`, and WCAG AA contrast tokens (`--text-muted`, `--bg-surface`, `--border`).
