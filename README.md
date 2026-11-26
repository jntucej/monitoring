# Gate Monitor — JNTUH CEJ Campus Gate & Hostel Monitoring System

> **Status:** IMPLEMENTED (Production Self-Hosted Stack)
> **Last Verified:** 2026-11-26

Gate Monitor (`mycampus` v1.0.0) is a self-hosted campus gate, hostel, academic, mess, and institutional operations platform built for JNTUH College of Engineering Jagtial (CEJ).

## Architecture & Stack

- **Frontend & API:** Next.js 16.4.6 (App Router), React 19.3.1, TypeScript, Tailwind CSS (`src/app/` — 467 pages, 798 API route handlers)
- **Database:** Self-hosted PostgreSQL 17 with Row-Level Security (RLS) and 321 SQL migrations (`database/migrations/`)
- **Cache & Rate Limiting:** Redis (`ioredis`) with Lua `EVALSHA` rate-limiting and PostgreSQL fallback (`RATELIMIT_PRIMARY_STORE`)
- **Background Worker:** Node.js worker (`worker/index.mjs`) running 29 scheduled/background jobs (`worker/jobs/`) and ops-agent (`worker/ops-agent.mjs`)
- **Reverse Proxy & Ingress:** Caddy (`caddy`) + Cloudflare Tunnel (`cloudflared`)
- **AI Layer:** `llm-proxy` service + `model-runtime/` (M1/M2 OCR/M3 document intelligence)
- **Observability & Security:** Prometheus, Alertmanager, cAdvisor, node-exporter, Falco (`docker-compose.yml`)

## Quick Start (Local / Docker Compose)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run typecheck and tests
npm run typecheck
npm run test:unit
```

For production container deployment, environment synchronization, and backup/restore procedures, see [`RUNBOOK.md`](RUNBOOK.md) and [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Key Documentation

- [`docs/INDEX.md`](docs/INDEX.md) — Canonical documentation index (live reference vs. historical reports)
- [`HANDOVER.md`](HANDOVER.md) — System handover and operational overview
- [`docs/CONTRACT.md`](docs/CONTRACT.md) — Auth, RBAC, permission engine, and action envelope contract
- [`docs/TECH_STACK.md`](docs/TECH_STACK.md) — Full technology stack and AI model layer
- [`docs/SERVER_ARCHITECTURE.md`](docs/SERVER_ARCHITECTURE.md) — Container topology and network architecture
- [`docs/SECURITY.md`](docs/SECURITY.md) & [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) — Threat model and security controls
- [`docs/roles/_overview.md`](docs/roles/_overview.md) — Role registry and permissions (`src/lib/roles.ts`)
- [`README_CREDENTIALS.md`](README_CREDENTIALS.md) — Demo/test role credentials reference
