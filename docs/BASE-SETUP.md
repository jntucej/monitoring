# Gate Monitor - Base Environment Operator Runbook

## §1 One-time Windows host setup
1. Open PowerShell as Administrator.
2. Run the host setup script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/windows-host-setup.ps1
   ```
3. Open Docker Desktop → **Settings** → **Resources** → **WSL Integration** and enable integration for Ubuntu 22.04.
4. Restart WSL2 from PowerShell:
   ```powershell
   wsl --shutdown
   ```
5. Reopen Ubuntu terminal.

## §2 One-time WSL2 Ubuntu setup
1. Open your Ubuntu 22.04 WSL2 terminal and navigate home:
   ```bash
   cd ~
   ```
2. Clone repository (if not already done) and run server setup:
   ```bash
   cd ~/gate-monitor
   bash scripts/server-setup.sh
   ```
3. Edit `~/gate-monitor-data/.env` to add your real `CLOUDFLARE_TUNNEL_TOKEN`.
4. Enable systemd in `/etc/wsl.conf` by adding/updating this exact block:
   ```ini
   [boot]
   systemd=true

   [interop]
   enabled=true

   [automount]
   options="metadata"
   ```
5. Shutdown WSL2 from PowerShell (`wsl --shutdown`), reopen Ubuntu, and verify systemd:
   ```bash
   systemctl status
   ```

## §3 Bring the base stack up
1. Navigate to repository root:
   ```bash
   cd ~/gate-monitor
   ```
2. Start infrastructure:
   ```bash
   docker compose -f docker-compose.base.yml up -d
   ```
3. Run health verification:
   ```bash
   bash scripts/verify-base.sh
   ```

## §4 Cloudflare Tunnel setup (one-time, in browser)
1. Log into Cloudflare Zero Trust dashboard.
2. Navigate to **Networks** → **Tunnels** → **Create tunnel** → name it `gate-monitor`.
3. Copy the token into `~/gate-monitor-data/.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
4. Add Public Hostname: `gate.example.com` → Service: `http://web:3000`.
   *(TLS is terminated at Cloudflare edge; inside the tunnel everything is plain HTTP).*
5. Save. Tunnel connects within 60 seconds.
6. Verify: `curl -I https://gate.example.com/api/health`

## §5 Backup validation (run once manually)
```bash
mkdir -p ~/gate-monitor-data/backups
docker exec gate_postgres pg_dump -U postgres gate_monitor | gzip > ~/gate-monitor-data/backups/gate_monitor_$(date +%Y%m%d_%H%M%S).sql.gz
```
*(Note: full systemd backup timer lands in a later pass).*

## §6 Reboot drill
1. Reboot Windows host.
2. After reboot, open WSL2 Ubuntu and run:
   ```bash
   cd ~/gate-monitor
   bash scripts/verify-base.sh
   ```
3. If stack is not running:
   ```bash
   sudo systemctl status gate-stack
   sudo journalctl -u gate-stack -n 100
   ```

## §7 Troubleshooting quick table
| Symptom | Fix |
|---|---|
| `docker: command not found` in WSL2 | Enable WSL2 integration in Docker Desktop |
| `verify-base.sh` fails on `.env` check | `chmod 600 ~/gate-monitor-data/.env` |
| `cloudflared` restart loop | Token expired; regenerate in CF dashboard |
| `postgres` refuses connections | Check `pgdata/` permissions are `700` |
| WSL2 uses only 8 GB RAM | Add `.wslconfig` on Windows host (§8) |

## §8 WSL2 memory tuning (optional)
On the Windows host, create `C:\Users\<you>\.wslconfig`:
```ini
[wsl2]
memory=12GB
processors=8
swap=4GB
```
Run `wsl --shutdown` to apply. Leaves 4 GB for Windows host.
