#!/bin/bash
# Server-side auto-heal agent
# Runs on the server, fixes common issues automatically
# Features: health check, auto-retry deploy, Telegram notifications

set -euo pipefail

LOG_FILE="/var/log/gate-monitor-heal.log"
REPO_DIR="/opt/monitoring/compose"
SSH_KEY="$HOME/.ssh/myrepo_deploy"
REMOTE_HOST="root@192.168.1.36"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-8830536905:AAH6Fd_K0NvLIMOQVGB4iD9YD6lmS_rTfC4}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-1926342151}"
MAX_RETRY=3
HEAL_INTERVAL=60  # seconds between retry attempts
CHECK_INTERVAL=300  # seconds between normal checks

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_telegram() {
    local msg="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="$msg" \
            -d parse_mode="HTML" \
            --data-urlencode "text=$msg" >/dev/null 2>&1 || true
    fi
}

# Test SSH connectivity
test_ssh() {
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" "$REMOTE_HOST" "echo OK" 2>/dev/null
}

# Check Docker containers are healthy
check_docker() {
    local unhealthy
    unhealthy=$(docker ps --filter name=gate --filter status=unhealthy --format "{{.Names}}" 2>/dev/null)
    
    if [ -z "$unhealthy" ]; then
        return 0
    fi
    
    log "Found unhealthy containers: $unhealthy"
    return 1
}

# Check if all containers are running
check_all_running() {
    docker ps --filter name=gate --format "{{.Names}}" 2>/dev/null | while read -r container; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
        if [ "$status" != "healthy" ]; then
            return 1
        fi
    done
}

# Restart failed containers
fix_containers() {
    log "Restarting containers..."
    docker compose -f /opt/monitoring/compose/docker-compose.yml restart 2>/dev/null || true
    sleep 5
    
    # Check again
    if ! check_docker; then
        log "Containers still unhealthy, rebuilding..."
        send_telegram "🔧 <b>Rebuilding Containers...</b>"
        docker compose -f /opt/monitoring/compose/docker-compose.yml build web --no-cache 2>/dev/null || true
        docker compose -f /opt/monitoring/compose/docker-compose.yml up -d --remove-orphans 2>/dev/null || true
        sleep 15
    fi
}

# Deploy with retry logic
deploy_with_retry() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRY ]; do
        log "Deploy attempt $(($retry_count + 1))/$MAX_RETRY"
        
        # Pull latest code
        cd "$REPO_DIR"
        git fetch origin >/dev/null 2>&1 || {
            log "Git fetch failed"
            retry_count=$((retry_count + 1))
            sleep $HEAL_INTERVAL
            continue
        }
        
        local local_hash remote_hash
        local_hash=$(git rev-parse HEAD 2>/dev/null)
        remote_hash=$(git rev-parse origin/main 2>/dev/null)
        
        if [ "$local_hash" != "$remote_hash" ]; then
            log "New commit detected, syncing..."
            git reset --hard origin/main >/dev/null 2>&1
            send_telegram "📥 <b>New Commit Detected</b>\n\nPulling and rebuilding..."
        fi
        
        # Build and deploy
        if docker compose -f /opt/monitoring/compose/docker-compose.yml build web --no-cache 2>/dev/null && \
           docker compose -f /opt/monitoring/compose/docker-compose.yml up -d --remove-orphans 2>/dev/null; then
            log "Build and deploy successful"
            
            # Wait for health check
            for i in $(seq 1 30); do
                if check_all_running; then
                    log "All containers healthy"
                    send_telegram "✅ <b>Deploy Successful</b>\n\nAll containers healthy!\nCommit: ${remote_hash:0:8}"
                    return 0
                fi
                sleep 5
            done
        else
            log "Build or deploy failed"
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRY ]; then
            log "Retrying in ${HEAL_INTERVAL} seconds..."
            send_telegram "⏳ <b>Retry Attempt</b> $retry_count/$MAX_RETRY"
            sleep $HEAL_INTERVAL
        fi
    done
    
    log "Max retry attempts reached"
    send_telegram "❌ <b>Deploy Failed</b>\n\nMax retry attempts ($MAX_RETRY) reached.\nManual intervention required."
    return 1
}

# Check deployment status from GitHub Actions
check_deploy_status() {
    local gh_token
    gh_token=$(cat /root/.github-token 2>/dev/null || echo "")
    
    if [ -z "$gh_token" ]; then
        return 1
    fi
    
    # Get latest workflow run status
    local status
    status=$(curl -s -H "Authorization: token $gh_token" \
        "https://api.github.com/repos/jntucej/monitoring/actions/runs?branch=main&status=failure" | \
        jq -r '.workflow_runs[0].status // "unknown"' 2>/dev/null || echo "unknown")
    
    if [ "$status" = "completed" ] || [ "$status" = "failure" ]; then
        return 0  # Deploy attempted
    fi
    return 1
}

# Main heal loop
heal_once() {
    log "=== Starting heal cycle ==="
    
    # Check SSH
    if ! test_ssh; then
        log "ERROR: SSH connection failed"
        send_telegram "🚨 <b>SSH Connection Failed</b>\n\nCannot connect to server.\nCheck server power/internet."
        return 1
    fi
    
    log "SSH: OK"
    
    # Check Docker health
    if ! check_docker; then
        log "FIXING: Unhealthy containers detected"
        send_telegram "🔧 <b>Auto-Fix</b>\n\nUnhealthy containers detected.\nAttempting to fix..."
        fix_containers
        
        if ! check_docker; then
            log "ERROR: Containers still unhealthy after fix"
            send_telegram "⚠️ <b>Fix Failed</b>\n\nContainers still unhealthy.\nManual intervention required."
            return 1
        fi
        log "FIXED: Containers healthy"
        send_telegram "✅ <b>Fixed</b>\n\nContainers restarted successfully."
    fi

    # Run auto-heal watchdog diagnostics and security checks
    if [ -f "/root/monitoring/scripts/auto-heal-watchdog.sh" ]; then
        /bin/bash /root/monitoring/scripts/auto-heal-watchdog.sh >> "$LOG_FILE" 2>&1 || true
    fi
    
    # Check git sync and deploy if needed
    cd "$REPO_DIR"
    git fetch origin >/dev/null 2>&1 || {
        log "ERROR: Git fetch failed"
        send_telegram "🚨 <b>Git Error</b>\n\nFailed to fetch from GitHub."
        return 1
    }
    
    local local_hash remote_hash
    local_hash=$(git rev-parse HEAD 2>/dev/null)
    remote_hash=$(git rev-parse origin/main 2>/dev/null)
    
    if [ "$local_hash" != "$remote_hash" ]; then
        log "NEW COMMIT: Syncing and deploying..."
        deploy_with_retry
        return $?
    fi
    
    log "=== Heal cycle complete ==="
    return 0
}

# Trigger manual heal via Telegram command
trigger_heal() {
    log "Manual heal triggered via Telegram"
    send_telegram "🤖 <b>Manual Heal Triggered</b>\n\nRunning diagnostics..."
    heal_once
}

# Main loop
main() {
    log "Auto-heal agent started"
    send_telegram "🤖 <b>Auto-Heal Agent Started</b>\n\nMonitoring for issues..."
    
    while true; do
        if ! heal_once; then
            log "Heal failed, retrying in $HEAL_INTERVAL seconds..."
            sleep $HEAL_INTERVAL
        fi
        sleep $CHECK_INTERVAL
    done
}

# Handle command line arguments
case "${1:-}" in
    --trigger)
        trigger_heal
        ;;
    --once)
        heal_once
        ;;
    *)
        main
        ;;
esac
