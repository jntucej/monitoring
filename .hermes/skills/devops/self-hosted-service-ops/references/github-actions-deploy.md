# GitHub Actions Auto-Deploy to Production

Standard workflow for automatic deployment via GitHub Actions when the production server is accessed via SSH.

## Workflow Structure

```yaml
name: Auto Deploy to Production
on:
  push:
    branches: [main]
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy via SSH
      uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |\
          cd /opt/monitoring/compose
          git fetch origin
          git reset --hard origin/main
          rsync -av --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.next' \
            src/ /opt/monitoring/compose/src/
          docker compose build web --no-cache
          docker compose up -d --remove-orphans
          
    - name: Notify Telegram
      if: success()
      uses: appleboy/telegram-action@master
      with:
        to: ${{ secrets.TELEGRAM_CHAT_ID }}
        token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
        message: |
          ✅ Deploy Success
          Commit: ${{ github.sha }}
```

## Manual Deploy Fallback

When GitHub Actions cannot reach the server (network issues), use the manual deploy script:

```bash
bash /root/monitoring/scripts/manual-deploy.sh
```

This script:
1. Tests SSH connectivity
2. Pulls latest code with `git reset --hard origin/main`
3. Builds and deploys Docker containers
4. Verifies health status

## Required Secrets

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Server hostname/IP accessible from GitHub Actions |
| `SERVER_USER` | SSH user (usually `root`) |
| `SSH_PRIVATE_KEY` | Full content of deploy private key |
| `TELEGRAM_BOT_TOKEN` | Bot token for notifications |
| `TELEGRAM_CHAT_ID` | Chat ID for alerts |

## Getting Secret Values

```bash
# SSH private key
cat ~/.ssh/myrepo_deploy

# Telegram (from .env)
grep TELEGRAM_BOT_TOKEN /root/monitoring/.env | cut -d'=' -f2 | tr -d '"'
grep TELEGRAM_CHAT_ID /root/monitoring/.env | cut -d'=' -f2 | tr -d '"'
```

## Network Access Solutions

GitHub Actions runs on public internet. Your server may be behind NAT/firewall.

### Option 1: Tailscale Funnel (Recommended)
Enable public SSH access via Tailscale:

```bash
# On server
tailscale funnel --tcp 22
```

Then get the public URL:
```bash
tailscale status | grep -E "cejtest\.tail"
# Returns: cejtest.tail374271.ts.net
```

Set `SERVER_HOST` to this URL (e.g., `cejtest.tail374271.ts.net`).

### Option 2: Router Port Forwarding
Forward WAN port 22 → LAN IP:22 on your router.

Set `SERVER_HOST` to your WAN IP.

### Option 3: Public Jump Host
Use a VPS with public IP as SSH relay.

## Pitfalls

- **GitHub Actions cannot reach private IPs**: LAN IPs (192.168.x.x, 10.x.x.x) are unreachable. Use Tailscale Funnel or public IP.
- **Tailscale Funnel requires authorization**: First enable via web UI: `https://login.tailscale.com/f/funnel?node=<node-id>`
- **SSH key must be in authorized_keys**: Deploy key public key must be in `/root/.ssh/authorized_keys` on server.
- **PermitRootLogin must be enabled**: Check `/etc/ssh/sshd_config` has `PermitRootLogin prohibit-password` or `yes`.
- **ListenAddress may block SSH**: If `ListenAddress 100.122.7.62` (Tailscale only), change to `ListenAddress 0.0.0.0` to accept connections on all interfaces.
- **Branch protection blocks direct push**: Protected branches require PR + status check. Use feature branch + PR workflow.
- **Remove required_status_checks for manual deploy**: If using manual deploy only, remove the status check requirement or create a dummy passing check.
- **rsync exclusions**: Always exclude `.git`, `node_modules`, `.next`, `.env*` to avoid copying sensitive files.
- **git reset --hard**: Use `git reset --hard origin/main` not `git pull` to avoid merge conflicts with untracked files.

## Auto-Heal Agent

When deployment fails, the auto-heal agent:
1. Diagnoses SSH connectivity
2. Checks Docker container status
3. Attempts to enable Tailscale Funnel
4. Sends detailed Telegram report

Workflow: `.github/workflows/auto-heal.yml`

## Verification Steps

After deploy, verify:
```bash
# Check container health
docker inspect gate_web --format '{{.State.Health.Status}}'

# Check latest commit
cd /opt/monitoring/compose && git log -1 --oneline

# Test endpoint
curl -s http://127.0.0.1/api/health
```

## Manual Deployment Procedure

1. SSH to server: `ssh root@<host> -i ~/.ssh/myrepo_deploy`
2. Navigate: `cd /opt/monitoring/compose`
3. Pull: `git fetch origin && git reset --hard origin/main`
4. Deploy: `docker compose build web --no-cache && docker compose up -d`
5. Verify: `docker ps --filter name=gate --format 'table {{.Names}}\t{{.Status}}'`
