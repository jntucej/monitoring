# Telegram Deploy Bot

## Commands

| Command | Description |
|---------|-------------|
| `/deploy` | Trigger deployment workflow |
| `/heal` | Auto-diagnose and fix issues |
| `/retry` | Retry failed deployment |
| `/status` | Check server status |

## Setup

1. Add environment variables to `/root/monitoring/.env`:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=1926342151
GITHUB_TOKEN=your_github_token
```

2. Test the bot:
```bash
cd /root/monitoring
python3 scripts/telegram_deploy.py status
```

3. Make executable:
```bash
chmod +x scripts/telegram_deploy.py
```

## How It Works

- `/deploy` → Triggers GitHub Actions workflow with `action: deploy`
- `/heal` → Tests SSH, checks Tailscale Funnel, attempts to enable it, checks Docker
- `/retry` → Triggers GitHub Actions workflow with `action: retry`
- `/status` → Shows container status and Tailscale connection

## Requirements

- SSH access to server (configured in `~/.ssh/config`)
- Tailscale connected on server
- GitHub token with repo access
- Python 3 with urllib
