# PROJECT_MAP.md — V5 Source Intelligence

- **Framework:** Next.js 16.4.6 (Turbopack), React, TypeScript, PostgreSQL (`gate_postgres`), Caddy (`gate_caddy`), Docker (`gate_web`).
- **Scale:** 445 pages, 669 API routes, 28 role keys (`src/server/policy/routes.ts`), 23 seeded QA roles (`/root/monitoring/scripts/smoke-creds.json`).
- **Design System:** Graphite Canvas semantic tokens (`src/app/globals.css`), hand-rolled primitives (`src/components/ui`), shared UX suite (`src/components/shared/`), `ApproverDecisionQueue` (`src/components/approver/ApproverDecisionQueue.tsx`).
- **Quality Gates:** `npx unslop-ui . --strict --quiet` (pre-commit hook), `npx tsc --noEmit`, `scripts/verify-all-roles.ts`.
