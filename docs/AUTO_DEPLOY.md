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

### Troubleshooting

**Workflow failing due to missing secrets?**
The workflow requires these GitHub Secrets to be configured:
- `SERVER_HOST` - Your server IP (192.168.1.36)
- `SERVER_USER` - SSH username (root)
- `SSH_PRIVATE_KEY` - Private key content from `~/.ssh/myrepo_deploy`
- `TELEGRAM_BOT_TOKEN` - From `.env`
- `TELEGRAM_CHAT_ID` - `1926342151`

Add them at: Repository → Settings → Secrets and variables → Actions

**Cannot push to main?**
```bash
# Check branch protection status
gh api repos/jntucej/monitoring/branches/main/protection

# To temporarily disable (emergency only)
gh api repos/jntucej/monitoring/branches/main/protection -X DELETE
```

**Workflow failed?**
```bash
# View recent runs
gh run list --repo jntucej/monitoring --branch main

# View logs for a specific run
gh run view <run-id> --log-failed
```
# test deploy
