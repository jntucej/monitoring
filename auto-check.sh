#!/usr/bin/env bash
date > /var/log/monitoring-heartbeat.log
cd /root/monitoring
export $(grep -v '^#' .env | xargs)

send_telegram() {
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "parse_mode=Markdown" \
      --data-urlencode "text=$1" >/dev/null 2>&1 || true
}

git fetch origin main --quiet

if [ -n "$(git status --porcelain -uno)" ]; then
    send_telegram "⚠️ *Auto-Deploy Skipped*
Tracked files in working tree are dirty. Manual intervention needed."
    echo "[$(date)] Dirty tree (tracked files modified), skipping deploy" >> /var/log/monitoring-deploy.log
    exit 0
fi

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    SHORT_HASH=$(git log -1 --format="%h" origin/main)
    AUTHOR=$(git log -1 --format="%an" origin/main)
    COMMIT_MSG=$(git log -1 --format="%s" origin/main)

    if [ ! -f /root/monitoring/.approve-deploy ]; then
        send_telegram "⏸ *Auto-Deploy Held*
New code detected on origin/main.
• *Commit:* \`#${SHORT_HASH}\` (${AUTHOR})
• *Message:* ${COMMIT_MSG}

Create \`/root/monitoring/.approve-deploy\` to proceed with deployment."
        echo "[$(date)] Update detected ($REMOTE). Held awaiting .approve-deploy." >> /var/log/monitoring-deploy.log
        exit 0
    fi
    
    send_telegram "⚙️ *Auto-Deploy Triggered*
📥 Pulling new code from GitHub...

*Commit:* \`#${SHORT_HASH}\`
*Author:* ${AUTHOR}
*Message:* ${COMMIT_MSG}"
    
    echo "[$(date)] Update detected. Synced to $REMOTE. Deploying..." >> /var/log/monitoring-deploy.log
    git pull --ff-only origin main >> /var/log/monitoring-deploy.log 2>&1 || {
        send_telegram "❌ *Auto-Deploy Failure*: git pull --ff-only failed. See logs."
        exit 1
    }
    
    if docker compose build >> /var/log/monitoring-deploy.log 2>&1 && docker compose up -d --remove-orphans >> /var/log/monitoring-deploy.log 2>&1; then
        HEALTHY=false
        for i in {1..20}; do
          STATUS=$(docker inspect --format="{{.State.Health.Status}}" gate_web 2>/dev/null || echo "missing")
          if [ "$STATUS" = "healthy" ]; then
            HEALTHY=true
            break
          fi
          sleep 3
        done

        if [ "$HEALTHY" = true ]; then
            docker image prune -f >> /var/log/monitoring-deploy.log 2>&1
            TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "N/A")
            send_telegram "🚀 *Deployment Succeeded!*
• *Commit*: \`#${SHORT_HASH}\` (${COMMIT_MSG})
• *Access*: http://${TAILSCALE_IP}:8000"
        else
            TAIL_LOG=$(tail -n 15 /var/log/monitoring-deploy.log)
            send_telegram "❌ *Critical Deploy Failure*
Health check failed after boot. Logs:
\`\`\`text
${TAIL_LOG}
\`\`\`"
        fi
    else
        TAIL_LOG=$(tail -n 15 /var/log/monitoring-deploy.log)
        send_telegram "❌ *Critical Deploy Failure*
Build or startup crashed. Logs:
\`\`\`text
${TAIL_LOG}
\`\`\`"
    fi
fi
