# SERVICE_INVENTORY — Gate Monitor

Evidence: `docker ps`/`docker compose ls` at `/opt/monitoring/compose` (read-only, 2026-10-12),
compose files in repo + `/opt`, systemd units. **Live compose project `compose` =
/opt/monitoring/compose/docker-compose.yml; repo `/root/monitoring/docker-compose.yml` drifts
from the live one** (see §6).

## 1. Gate stack (project `compose`, dir `/opt/monitoring/compose`)

Managed by systemd unit `gate-stack.service` (`/root/monitoring/systemd/gate-stack.service`):
oneshot+RemainAfterExit, `docker compose up -d` with `--env-file /opt/monitoring/env/production.env`,
memory caps 4G/6G, CPU 200%, `KillMode=control-group`, restart on-failure/15s.
State at survey: **active (exited)** — i.e. the up/down completed; all 5 containers running.

| Service | Image / build | Container | Ports (host→ctr) | Healthcheck | Volumes | depends_on |
|---|---|---|---|---|---|---|
| `postgres` | `supabase/postgres:17.6.1.136` | `gate_postgres` | 5432 internal only | `pg_isready` every 5s, 5 retries | `pgdata` (named) | — |
| `redis` | `redis:7-alpine` | `gate_redis` | 6379 internal only | `redis-cli -a … ping` 10s, 3 retries | `redisdata` | — |
| `web` | local build → `compose-web` (Dockerfile `runner` stage: node:20-alpine, `next:16.3.1`, standalone `node server.js`) | `gate_web` | 3000 internal only (Caddy fronts it) | `wget /api/health` 10s, 5 retries, 30s start period | tmpfs `/tmp` 128m + `/app/.next/cache` 512m; read_only fs, `cap_drop: ALL`, `no-new-privileges` | postgres+redis `service_healthy` |
| `worker` | local build → `compose-worker` (Dockerfile `worker` stage; `node worker/index.mjs`) | `gate_worker` | 3001 internal only (worker health HTTP) | `wget :3001/health` 30s, 3 retries | tmpfs `/tmp`; read_only, `cap_drop: ALL` | postgres+redis `service_healthy` |
| `caddy` | `caddy:2-alpine` | `gate_caddy` | `127.0.0.1:80` + `127.0.0.1:443` (loopback-only!) | none | `./Caddyfile` ro + `caddy_data` + `caddy_config` | web `service_healthy` |

Compose-level: all services `restart: always`; single bridge network `gate-net`; `env_file`
`path: .env, required: false` on postgres/redis/web/worker (so `/opt/monitoring/compose/.env`
fills `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, secrets); `cpu_shares` 1024/768/256/—.

**RUNNING state (verified):** `gate_web` Up 26m (healthy) · `gate_worker` Up ~1h (healthy) ·
`gate_postgres` Up ~1h (healthy) · `gate_redis` Up ~1h (healthy) · `gate_caddy` Up 33h (no
healthcheck, `caddy` reports fine). The web+worker restart ≈1h before the survey, caddy longer —
consistent with a recent redeploy (`/opt/monitoring/releases`, `audit.log` timestamps).

## 2. Monitoring stack (project `server-monitoring`, dir `/opt/server-monitoring`)

| Service | Image | Exposed | Notes |
|---|---|---|---|
| `mon_grafana` | `grafana/grafana:11.5.1` | `100.122.7.62:3001:3000` (Tailscale-only) | sign-up disabled; provisioning+dashboards ro-mounted |
| `mon_prometheus` | `prom/prometheus:v3.1.0` | internal 9090 | 15d retention; scrape targets incl. `/metrics` on the gate web app (via `MONITORING_PROM_URL`/`MONITORING_LOKI_URL`/`MONITORING_GRAFANA_URL` envs passed to web+worker containers, consumed by `src/lib/monitoring.ts` and `src/app/metrics`) |
| `mon_loki` | `grafana/loki:3.4.1` | internal 3100 | log pipeline via Alloy |
| `mon_alloy` | `grafana/alloy:v1.7.1` | — | mounts `/var/run/docker.sock` ro + journald → scrapes/exporters → prom/loki |
| `mon_node_exporter` | `prom/node-exporter:v1.8.2` | 9100 | host `pid: host`, proc/sys ro |
| `mon_cadvisor` | `gcr.io/cadvisor/cadvisor:v0.51.0` | 8080 | **`privileged: true`**, `/`, `/var/lib/docker` ro, `/dev/kmsg` |
| `mon_postgres_exporter` | `prometheuscommunity/postgres-exporter:v0.17.1` | 9187 | joins `monitoring_gate-net` (shared bridge) + `mon-net`; `--disable-settings-metrics` (PG17 NULL crash workaround) |

All `unless-stopped`, 2-3 days uptime at survey.

## 3. Edge / tunneling (outside compose)

| Item | State | Detail |
|---|---|---|
| **Cloudflare tunnel** `cloudflared.service` | active (running) | `/usr/bin/cloudflared tunnel run --token-file /etc/cloudflared/token`, notify type, restart 5s. TLS terminates at Cloudflare edge → Caddy receives plain HTTP (`Caddyfile` has no `tls`/HSTS by design, `:80` only). Caddy binds 127.0.0.1:80/443 so the origin is loopback-only. |
| `cloudflare-ddns` (project, `/root/cloudflare-ddns`) | running | `favonia/cloudflare-ddns:latest`; keeps `home.ucej.in` pointed at the host; token in a ro volume |
| Tailscale | active | Grafana pin `100.122.7.62` = tailscale IP; the only *user-facing* port out of the monitoring stack |

App public URL: `monitor.ucej.in` (per `docs/quality/BASELINE.md`), via CF tunnel → Caddy → web:3000.

## 4. systemd: `cej-bot`

Unit `/etc/systemd/system/cej-bot.service` — **active (running) since 2026-10-10, 1 day 22h at survey**.
- `ExecStart=/usr/bin/python3 /root/monitoring/bot_daemon.py` (repo file `bot_daemon.py`, 4.7KB)
- "CEJ Server Read-Only Telegram Bot": env `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID`
  (`EnvironmentFile=/root/monitoring/.env`); single authorized chat id; **command allowlist**
  (`help status log restart health deploylog deploystatus checkstatus stats tail ps updates`);
  runs subprocesses against `/root/monitoring` ops scripts.
- Security: `CapabilityBoundingSet=` (empty), `NoNewPrivileges=true`, `Restart=always`/10s,
  runs as **root** (`User=root`) — see risk register.
- Related: `/opt/monitoring/scripts/gate-watchdog.sh`, backup scripts
  (`backup-postgres.sh`, `master-backup.sh`, `restore_postgres.sh`, `verify-backup.sh`,
  `quick-recover.sh`), deploy pipeline `01-discover/02-prepare/03-deploy.sh` + `verify-*`.

## 5. Data/env layout on the host

- `/opt/monitoring/`: `compose/` (live app dir, has its own `.env` + built `compose-web`/`compose-worker`
  images), `env/production.env` (secrets consumed by systemd + compose; contains
  `JWT_SECRET`, `AUTH_SECRET`, `MOBILE_TOKEN_SECRET`, `MFA_ENROLL_SECRET`, `DATABASE_URL`,
  `REDIS_URL`, `WEBHOOK_SECRET`, `INTERNAL_SERVICE_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, …),
  `backups/`, `releases/`, `credentials/`, `logs/`, `scripts/`.
- Repo `/root/monitoring/.env` (2.2KB, mode 600) is separate from
  `/opt/monitoring/env/production.env` (2.7KB) — **two env sources that can drift**
  (production.env has more keys: `ACME_EMAIL`, `PUBLIC_URL`, `ALLOWED_ORIGIN`, `AUTH_PROVIDER`,
  `AUTH_URL`, `NEXT_PUBLIC_*`).
- RAG/Harbor agent: `src/app/api/bot/chat` + `src/lib/rag/*` call an OpenAI-compatible endpoint
  (`RAG_LLM_API_URL`/`HERMES_API_BASE`, model default `agnes/agnes-3.0-flash`; embeddings to
  `RAG_EMBEDDING_API_URL`, 1536-dim) — external egress from the web container; KB ingestion via
  `npm run kb:ingest` (`scripts/ingest-kb.mjs` → pgvector).

## 6. Compose drift (repo vs live) — verified by `diff`

Live `/opt/monitoring/compose/docker-compose.yml` (3596B) ≠ repo `/root/monitoring/docker-compose.yml`
(3689B):
- Live sets **per-component** `POSTGRES_HOST/POSTGRES_USER/POSTGRES_PORT/POSTGRES_PASSWORD/REDIS_URL`
  on web+worker; repo sets a single `DATABASE_URL` env var (both point at `postgres:5432` —
  functionally equivalent, because `src/lib/postgres.ts` L24-30 prefers `DATABASE_URL` then falls
  back to the parts). The repo form is what was just merged (DATABASE_URL/POSTGRES_PASSWORD wiring).
- Live file lacks the worker `DATABASE_URL` line that the repo adds at L99.
- `server.js` exists at `/opt/monitoring/compose/server.js` (8KB) — the standalone server
  wrapper; **not present in repo** (repo's `.next` build ships it at image-build time instead).
- `/opt/monitoring/compose/.env` (2677B, world-readable `rw-r--r--`) vs
  `/opt/monitoring/env/production.env` — compose `env_file` reads the former; systemd `--env-file`
  reads the latter. A secret changed in one and not the other needs **both** files updated.

## 7. What is NOT running

No separate WS service container is defined; `/api/ws` returns 501 and the comment in
`src/app/api/ws/route.ts` says "the real WebSocket is proxied by Caddy to a separate service" —
no such service exists in compose, so the WS path is effectively dead/placeholder.
`ENABLE_SYNC_BRIDGE` is not set in the live env snippets → sync-bridge child is disabled in production.
