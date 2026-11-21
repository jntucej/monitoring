# Gate Monitor Architecture Master Sheet

Status: pointer document. The architecture is now described across:

| Concern | Document |
|---|---|
| Role consoles + shared kernel (never-fork line) | `docs/CONTRACT.md` (incl. 2026-11-21 Teaching Capability Addendum: action envelope, `POST /api/actions`, binding gate) |
| Teaching capability + academic subsystem (design, model, tiers, phases) | `docs/teaching-capability-architecture.md` |
| Container topology (Caddy → web/worker → Postgres 17 / Redis 7) | `docs/SERVER_ARCHITECTURE.md` |
| Self-hosted DB layer (Supabase-compatible Postgres image, manual RLS notes) | `docs/TECH_STACK.md` §5, `docs/MIGRATION.md` (completed) |
| Role/permission workflows + role→stage matrix | `docs/permission-workflow-architecture.md` |
| Autonomous layer (agents, hash-chain audit, 13-job cron) | `docs/AUTONOMOUS_OPERATIONS.md`, `docs/IMPLEMENTATION_BLUEPRINT.md` |
| Per-role flows (mermaid) | `docs/flow/*.mermaid` |

All API endpoints have been aligned with this architecture.