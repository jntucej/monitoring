# Gate Monitor - Server Architecture & Container Topology

## 1. Overview
Gate Monitor is deployed as an autonomous, self-hosted containerized appliance on Debian 13 (Trixie). All cloud dependencies (Supabase, Vercel, Upstash) have been eliminated in favor of containerized native PostgreSQL 16, Redis 7, Caddy 2, Next.js Standalone Runner, and a Node.js Background Worker.

## 2. Container Topology & Network Isolation

All container communication occurs over a private internal bridge network (`gate-net`). **Only Caddy binds ports 80 and 443 to the host.**

```
INTERNET / CAMPUS CLIENTS (Port 80 / 443)
                 │
                 ▼
     ┌───────────────────────┐
     │      gate_caddy       │ (Caddy 2: Auto-TLS, Reverse Proxy, SSE)
     └───────────┬───────────┘
                 │ (Internal gate-net)
     ┌───────────┴───────────┐
     │                       │
     ▼                       ▼
┌──────────────┐      ┌──────────────┐
│   gate_web   │      │ gate_worker  │ (Background node-cron jobs)
│   (Next.js)  │      └──────┬───────┘
└──────┬───────┘             │
       │                     │
       ├─────────────────────┤
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│gate_postgres │      │  gate_redis  │ (Cache & Distributed Rate Limit)
│(Postgres 16) │      └──────────────┘
└──────────────┘
```

## 3. Component Breakdown

| Service | Container Name | Image | Function | Internal Port |
|---|---|---|---|---|
| **Caddy** | `gate_caddy` | `caddy:2-alpine` | TLS termination, reverse proxy, SSE buffering disable | 80, 443 (Host) |
| **Web** | `gate_web` | `gate-web:latest` | Next.js 16 standalone SSR and API engine | 3000 |
| **Worker** | `gate_worker` | `gate-worker:latest` | Scheduled cron jobs (backfill, pass cleanup, log rotation) | N/A |
| **Postgres** | `gate_postgres` | `postgres:15-alpine` | Primary transactional relational database | 5432 (Internal) |
| **Redis** | `gate_redis` | `redis:7-alpine` | In-memory cache, token bucket rate limiting | 6379 (Internal) |

## 4. Host Directory Layout (`/opt/monitoring`)

```
/opt/monitoring/
├── compose/
│   ├── docker-compose.yml
│   ├── Caddyfile
│   └── database/
├── config/
├── env/
│   └── production.env       # chmod 600 (Restricted to root)
├── backups/
│   ├── daily/               # Retention: 30 days
│   └── weekly/
├── logs/
│   └── caddy/
├── scripts/                 # Operational CLI utilities
└── releases/
```
