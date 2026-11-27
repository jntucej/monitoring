# Infrastructure Monitoring — SysAdmin (Grafana + Observability)

## What was added

A central, **read-only** infrastructure observability section inside the
existing SysAdmin dashboard. The SysAdmin has one place to monitor the whole
fleet without touching the server terminal.

### New routes (`/sysadmin/monitoring/*`)

| Route | Purpose | Reuses |
| --- | --- | --- |
| `/sysadmin/monitoring` | Monitoring hub — System Health (host CPU/RAM/disk/uptime) + API throughput + observability stack | `SystemHealthPanel`, `DualThroughputCurve`, `ObservabilityStackPanel` |
| `/sysadmin/monitoring/metrics` | Prometheus metrics (API rate, p95 latency, scrape targets) | `DualThroughputCurve` + named-query proxy |
| `/sysadmin/monitoring/logs` | Application + infrastructure logs (Loki) | `ObservabilityStackPanel` |
| `/sysadmin/monitoring/containers` | Docker container status + resources | `DockerFleetPanel` |
| `/sysadmin/monitoring/database` | PostgreSQL / Redis health | links to `/sysadmin/database-health` + `/sysadmin/docker-services` |
| `/sysadmin/monitoring/grafana` | Embedded, read-only Grafana dashboards | `GrafanaEmbed` (server proxy) |

All six are SysAdmin-gated (`AuthGuard allowedRoles=["sysadmin","admin"]`).

### New files

- `src/app/(sysadmin)/sysadmin/monitoring/{page,containers,database,logs,grafana,metrics}.tsx`
- `src/app/(sysadmin)/sysadmin/monitoring/_frame.tsx` (shared sub-page frame + RBAC + section sub-nav)
- `src/components/sysadmin/monitoring/SystemHealthPanel.tsx`
- `src/components/sysadmin/monitoring/GrafanaEmbed.tsx`
- `src/components/sysadmin/monitoring/MonitoringHubNav.tsx`
- `src/app/api/sysadmin/grafana/health/route.ts`
- `src/app/api/sysadmin/grafana/embed/route.ts`
- Registry additions in `src/lib/monitoring/registry.ts` (`host.uptime`, `pg.latency`, `prometheus.up`)
- Grafana helpers in `src/lib/monitoring.ts` (`grafanaHealth`, `grafanaAuthHeaders`)
- Nav entry in `src/hooks/useNavigation.ts` (single "Monitoring" rail item → the hub)

No existing monitoring panel or API was duplicated — the hub **links/reuses**
`DockerFleetPanel`, `ObservabilityStackPanel`, `DualThroughputCurve`, and the
`/api/admin/monitoring` named-query proxy that already exist.

## Security model

- **Read-only viewer.** The SysAdmin dashboard surfaces telemetry only.
  Container restart / service management stays in the separate `mon_*`
  monitoring stack — this UI does not expose those actions.
- **Grafana credentials never reach the browser.** The iframe points at the
  same-origin, auth-gated `/api/sysadmin/grafana/embed`, which streams the
  dashboard with a dedicated **read-only viewer** service-account applied
  server-side (`MONITORING_GRAFANA_TOKEN` or `MONITORING_GRAFANA_USER`/`_PASS`).
  Admin credentials are not used.
- The health probe + embed return explicit **unavailable** states when
  Grafana/Loki/Prometheus are unreachable — never fabricated values.
- No internal monitoring port (Grafana/Prometheus/Postgres/Redis) is exposed
  publicly. Access is via the authenticated web app.

## Architecture decision (recorded)

**Read-only viewer** — dashboards + live metrics/logs/containers/DB health.
Infrastructure *administration* (restart, service management) is kept
separate in the `mon_*` stack, per the "keep them separate" preference.

## Deploy-gated configuration (NOT applied to the running stack)

Grafana is currently on its own Docker bridge (`mon_grafana`) that
`gate_web` cannot reach, and `MONITORING_GRAFANA_URL` / the viewer account
are not set in `.env`. To make embedded Grafana live, at **deploy time**:

1. **Shared network** so `gate_web` can reach `mon_grafana:3000`. In
   `docker-compose.yml`, attach `web` to the monitoring network and add a
   `mon_grafana` external-network reference (Grafana's `GF_SERVER_ROOT_URL`
   already points at the Tailscale IP). Example:

   ```yaml
   services:
     web:
       networks:
         - default
         - monitoring-net        # shared with mon_grafana
   networks:
     monitoring-net:
       external: true           # created by the /opt/monitoring compose project
   ```

   (Adjust `external: true` to the real network name the `mon_*` project
   uses — verify with `docker network ls`.)

2. **Env vars in `.env`** (never committed):

   ```
   MONITORING_GRAFANA_URL=http://mon_grafana:3000     # or the Tailscale IP:port
   MONITORING_GRAFANA_TOKEN=<read-only service-account token>
   ```

   Create the read-only service account **inside Grafana**
   (Admin → Service accounts → read scope), then mint a token. Only the
   `MONITORING_GRAFANA_TOKEN` value is secret; it lives in `.env`, never in
   the frontend or the repo.

3. **Optional public subpath** (the "both approaches" piece). If you want
   Grafana also reachable at a public URL through Caddy, add a `handle
   /grafana` reverse-proxy block to `compose/Caddyfile` pointed at
   `mon_grafana:3000` with the same auth. This is optional — the embedded
   proxy route above already gives authenticated access without a public
   Grafana port.

Until those deploy steps are done, `/sysadmin/monitoring/grafana` renders an
explicit "Grafana unavailable — configure MONITORING_GRAFANA_URL + a read-only
viewer" state (this is by design; no fake dashboards).

## Verification

- `tsc` clean (excluding pre-existing `@heroui/react` module-resolution
  errors in `src/components/ui/`).
- `next build` succeeds.
- New API routes are sysadmin-only + rate-limited via `withApiChain`.
