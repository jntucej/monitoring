# Gate Monitor - Server Architecture & Container Topology

## 1. Overview
Gate Monitor is deployed as an autonomous, self-hosted containerized
appliance on Debian 13 (Trixie). All cloud dependencies (Supabase, Vercel,
Upstash) have been eliminated in favor of containerized native PostgreSQL
(supabase/postgres 17.6.1.136), Redis 7, Caddy 2, Next.js Standalone
Runner, and a Node.js Background Worker.

> 2026-11: Postgres moved to the `supabase/postgres:17.6.1.136` image —
> plain `postgres:*` + the Supabase extension stack (pgcrypto etc.).
> Container/image names now follow `docker-compose.yml`:
> `monitoring-web`, `monitoring-worker`, caddy 2-alpine.

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
│(Postgres 17) │      └──────────────┘
└──────────────┘
```

## 3. Component Breakdown

| Service | Container Name | Image | Function | Internal Port |
|---|---|---|---|---|
| **Caddy** | `gate_caddy` | `caddy:2-alpine` | TLS termination, reverse proxy, SSE buffering disable | 80, 443 (Host) |
| **Web** | `gate_web` | `monitoring-web:latest` | Next.js 16 standalone SSR and API engine (467 pages, 798 API routes) | 3000 |
| **Worker** | `gate_worker` | `monitoring-worker:latest` | Scheduled cron jobs (backfill, pass cleanup, `backup-maintenance` 30m, S3 offsite) | N/A |
| **Postgres** | `gate_postgres` | `supabase/postgres:17.6.1.136` | Primary transactional relational database (`gate_monitor`) | 5432 (Internal) |
| **Redis** | `gate_redis` | `redis:7-alpine` | In-memory cache, Lua EVALSHA distributed rate limiting | 6379 (Internal) |
| **LLM Proxy** | `gate_llm_proxy` | `node:20-alpine` | Cloud AI proxy (OmniRoute) for M1/M2/M3 model runtime | Internal |
| **Prometheus** | `gate_prometheus` | `prom/prometheus:v3.1.0` | App & container metrics scraping | 9090 (Internal) |
| **Alertmanager** | `gate_alertmanager` | `prom/alertmanager:v0.28.1` | Alert routing & Telegram webhook dispatch | 9093 (Internal) |
| **cAdvisor** | `gate_cadvisor` | `gcr.io/cadvisor/cadvisor:v0.51.0` | Container CPU/memory/network metrics | 8080 (Internal) |
| **DDNS** | `cloudflare-ddns` | `favonia/cloudflare-ddns:latest` | Dynamic DNS updater for Cloudflare | N/A |

> **Host Observability Stack (`/opt/server-monitoring`):** `mon_grafana` (`11.5.1`), `mon_loki` (`3.4.1`), `mon_alloy` (`v1.7.1`), `mon_prometheus` (`v3.1.0`), `mon_postgres_exporter` (`v0.17.1` with `--disable-settings-metrics`), `mon_node_exporter` (`v1.8.2`), `mon_cadvisor` (`v0.51.0`).

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
