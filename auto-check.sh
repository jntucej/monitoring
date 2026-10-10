#!/usr/bin/env bash
date > /var/log/monitoring-heartbeat.log
cd /root/monitoring
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  value="${value%\"}"
  value="${value#\"}"
  export "$key=$value"
done < .env

# Deduplication file
DEDUP_FILE="/root/monitoring/.last_notified_hash"
LAST_HASH=""

send_telegram() {
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "parse_mode=Markdown" \
      --data-urlencode "text=$1" >/dev/null 2>&1 || true
}

# Helper: only send message if status changed
send_if_changed() {
    local status_key="$1"
    local message="$2"
    local current_hash
    current_hash=$(echo -n "${status_key}$(date +%Y%m%d)" | md5sum | cut -d' ' -f1)
    
    if [ -f "$DEDUP_FILE" ]; then
        local last_status
        last_status=$(grep "^${status_key}=" "$DEDUP_FILE" 2>/dev/null | cut -d'=' -f2)
        if [ "$last_status" = "$current_hash" ]; then
            # Status hasn't changed, skip notification
            return 0
        fi
    fi
    
    # Update dedup file
    if [ -f "$DEDUP_FILE" ]; then
        sed -i "s/^${status_key}=.*//g" "$DEDUP_FILE"
    fi
    echo "${status_key}=${current_hash}" >> "$DEDUP_FILE"
    
    send_telegram "$message"
}

git fetch origin main --quiet

if [ -n "$(git status --porcelain -uno)" ]; then
    send_if_changed "dirty" "⚠️ *Auto-Deploy Skipped*
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
        send_if_changed "held_${SHORT_HASH}" "⏸ *Auto-Deploy Held*
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
        send_if_changed "deploy_fail" "❌ *Auto-Deploy Failure*: git pull --ff-only failed. See logs."
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
            send_if_changed "deploy_success_${SHORT_HASH}" "🚀 *Deployment Succeeded!*
• *Commit*: \`#${SHORT_HASH}\` (${COMMIT_MSG})
• *Access*: http://${TAILSCALE_IP}:8000"
        else
            TAIL_LOG=$(tail -n 15 /var/log/monitoring-deploy.log)
            send_if_changed "deploy_health_fail" "❌ *Critical Deploy Failure*
Health check failed after boot. Logs:
\`\`\`text
${TAIL_LOG}
\`\`\`"
        fi
    else
        TAIL_LOG=$(tail -n 15 /var/log/monitoring-deploy.log)
        send_if_changed "deploy_build_fail" "❌ *Critical Deploy Failure*
Build or startup crashed. Logs:
\`\`\`text
${TAIL_LOG}
\`\`\`"
    fi
fi
