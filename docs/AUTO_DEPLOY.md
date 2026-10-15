# Auto Deploy Guide

## GitHub Actions Auto Deploy

Auto-deploy workflow is configured in `.github/workflows/deploy.yml`.

### Triggers
1. **Auto**: On push to `main` branch
2. **Manual**: From GitHub Actions page → "Run workflow"

### Required Secrets

Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SERVER_HOST` | Server IP or hostname | `192.168.1.36` |
| `SERVER_USER` | SSH username | `root` |
| `SSH_PRIVATE_KEY` | SSH private key (for server login) | Copy from `~/.ssh/myrepo_deploy` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | From `.env` |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | `1926342151` |

### Get Secret Values

```bash
# SSH Private Key
cat ~/.ssh/myrepo_deploy

# Telegram Bot Token
grep TELEGRAM_BOT_TOKEN /root/monitoring/.env
```

### Deploy Flow

```
push to main
    ↓
GitHub Actions triggered
    ↓
SSH to server
    ↓
git pull latest code
    ↓
rsync src/ to /opt/monitoring/compose/
    ↓
docker compose build + up
    ↓
Wait for healthy
    ↓
Telegram notification
```

### Manual Trigger

Go to: Repository → Actions → Auto Deploy to Production → Run workflow
