# Cloudflare Tunnel (CLI-managed) — lifecycle

Tunnel config lives in Git here, not in the Cloudflare dashboard. That means:
no token to leak, no dashboard dependency, and recreating the tunnel is a
re-runnable command sequence rather than a manual dashboard dance.

## Files

| File | Purpose |
|---|---|
| `cloudflared/config.yml` | Tunnel definition (UUID, ingress rules, `protocol: http2`) |
| `cloudflared/credentials.json` | Per-tunnel credentials (NOT in Git — see `.gitignore`) |
| `docker-compose.yml` (cloudflared service) | Runs cloudflared on `gate-net`, mounts both files read-only |
| `systemd/cloudflared-gate-monitor.service` | Alternative: run cloudflared on the host instead of Docker |

## Initial setup (one time)

```bash
# 1. Authenticate with Cloudflare (writes ~/.cloudflared/ and picks an account)
cloudflared tunnel login

# 2. Create the tunnel
cloudflared tunnel create gate-monitor
# → prints: Created tunnel gate-monitor, UUID <uuid>
# → saved credentials file: ~/.cloudflared/<uuid>.json

# 3. Move credentials into the compose dir (Git-tracked location)
cp ~/.cloudflared/<uuid>.json cloudflared/credentials.json
chmod 600 cloudflared/credentials.json

# 4. Set the UUID in config.yml (tunnel: <uuid>)

# 5. DNS routes — Cloudflare needs CNAMEs pointing at the tunnel
cloudflared tunnel route dns gate-monitor monitor.cej.in
cloudflared tunnel route dns gate-monitor hooks.cej.in
# → creates monitor.cej.in and hooks.cej.in CNAMEs in the Cloudflare account
#    that owns the zone (must be the same account as `tunnel login`)

# 6. Verify the route landed
dig monitor.cej.in +short
# → <uuid>.cfargotunnel.com
```

## Bring up

```bash
cd /opt/monitoring/compose
docker compose up -d --no-deps --force-recreate cloudflared
docker logs -f gate_cloudflared
```

Expected within ~10 seconds:

```
INF Starting tunnel tunnelID=<uuid>
INF Connection <n> registered connIndex=0 location=BOM
INF Connection <n> registered connIndex=1 location=BLR
INF Connection <n> registered connIndex=2 location=MAA
INF Connection <n> registered connIndex=3 location=BOM
```

Four `registered` lines = healthy (4 PoPs for redundancy).

## Verify

```bash
curl -sI https://monitor.cej.in/api/health
# expect: HTTP/2 200, server: cloudflare

curl -s https://monitor.cej.in/api/health
# expect: {"status":"healthy"}

# Real IP reaches the app (not a 172.x.x.x container address)
docker exec gate_postgres psql -U postgres -d gate_monitor -tAc \
  "SELECT ip_address, path, timestamp FROM api_metrics ORDER BY timestamp DESC LIMIT 5;"
```

## Recreating the tunnel (e.g. after an account migration)

```bash
cloudflared tunnel destroy gate-monitor
cloudflared tunnel create gate-monitor
cp ~/.cloudflared/<new-uuid>.json cloudflared/credentials.json
# edit config.yml: tunnel: <new-uuid>
docker compose up -d --force-recreate cloudflared
```

## Kill switch

Revoke the tunnel entirely from the CLI:

```bash
cloudflared tunnel destroy gate-monitor
```

This removes the CNAMEs and tears down the connector. The DNS zone is
unaffected — `monitor.cej.in` simply stops resolving.

## Host-mode alternative (systemd)

If you'd rather run cloudflared on the host than in Docker:

```bash
cp systemd/cloudflared-gate-monitor.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cloudflared-gate-monitor
systemctl status cloudflared-gate-monitor
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ERR Failed to dial edge` | Outbound 443 blocked, or creds wrong | `docker exec gate_cloudflared curl -sI https://api.cloudflare.com/` |
| Tunnel shows "Down" | Connector not running | `docker compose ps cloudflared`, `docker logs gate_cloudflared` |
| `502 Bad Gateway` | Tunnel up, Caddy unreachable | `docker exec gate_cloudflared wget -qO- http://caddy:80/api/health` |
| `530` / `1033` | Public hostname not saved, or DNS not propagated | `dig monitor.cej.in`, check `config.yml` ingress rules |
| Tunnel flaps every minute | Protocol fell back to QUIC (UDP blocked) | Ensure `protocol: http2` is in `config.yml` — it must be a single line |
| All users show the same IP in audit | `X-Client-IP` not forwarding `CF-Connecting-IP` | Patch Caddyfile `reverse_proxy` block; `docker compose restart caddy` |
| `wss://monitor.cej.in` fails | Cloudflare auto-upgrades to WSS on 443 | Nothing to do — WSS goes over 443, it works through the tunnel automatically |