#!/bin/bash
# Server-side auto-heal agent
# Runs on the server, fixes common issues automatically

set -euo pipefail

LOG_FILE="/var/log/gate-monitor-heal.log"
REPO_DIR="/opt/monitoring/compose"
SSH_KEY="$HOME/.ssh/myrepo_deploy"
REMOTE_HOST="root@192.168.1.36"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-1926342151}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_telegram() {
    local msg="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="$msg" \
            -d parse_mode="HTML" >/dev/null 2>&1 || true
    fi
}

# Test SSH connectivity
test_ssh() {
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" "$REMOTE_HOST" "echo OK" 2>/dev/null; then
        return 0
    fi
    return 1
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

# Restart failed containers
fix_containers() {
    log "Restarting containers..."
    docker compose -f /opt/monitoring/compose/docker-compose.yml restart 2>/dev/null || true
    sleep 5
    
    # Check again
    if ! check_docker; then
        log "Containers still unhealthy, rebuilding..."
        docker compose -f /opt/monitoring/compose/docker-compose.yml build web --no-cache 2>/dev/null || true
        docker compose -f /opt/monitoring/compose/docker-compose.yml up -d --remove-orphans 2>/dev/null || true
    fi
}

# Check if server is reachable
is_server_reachable() {
    ping -c 1 -W 5 192.168.1.36 >/dev/null 2>&1 || return 1
    return 0
}

# Main heal loop
heal_once() {
    log "=== Starting heal cycle ==="
    
    # Check SSH
    if ! test_ssh; then
        log "ERROR: SSH connection failed"
        send_telegram "🚨 <b>Heal Failed</b>\n\nSSH connection to server failed.\nCheck server power/internet."
        return 1
    fi
    
    log "SSH: OK"
    
    # Check Docker
    if ! check_docker; then
        log "FIXING: Unhealthy containers detected"
        send_telegram "🔧 <b>Auto-Fix</b>\n\nUnhealthy containers detected.\nRestarting..."
        fix_containers
        sleep 10
        
        if ! check_docker; then
            log "ERROR: Containers still unhealthy after fix"
            send_telegram "⚠️ <b>Fix Failed</b>\n\nContainers still unhealthy after restart.\nManual intervention required."
            return 1
        fi
        log "FIXED: Containers healthy"
        send_telegram "✅ <b>Fixed</b>\n\nContainers restarted successfully."
    fi
    
    # Check git sync
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
        log "NEW COMMIT: Syncing..."
        git reset --hard origin/main >/dev/null 2>&1
        send_telegram "📥 <b>Syncing</b>\n\nNew commit detected. Updating..."
        
        # Rebuild if needed
        docker compose -f /opt/monitoring/compose/docker-compose.yml build web --no-cache 2>/dev/null || true
        docker compose -f /opt/monitoring/compose/docker-compose.yml up -d --remove-orphans 2>/dev/null || true
        sleep 15
        
        if check_docker; then
            log "SUCCESS: Deployed new commit"
            send_telegram "✅ <b>Deployed</b>\n\nNew commit deployed successfully."
        else
            log "ERROR: Deploy failed"
            send_telegram "❌ <b>Deploy Failed</b>\n\nNew commit failed to deploy."
            return 1
        fi
    fi
    
    log "=== Heal cycle complete ==="
    return 0
}

# Main loop
main() {
    log "Auto-heal agent started"
    
    while true; do
        if ! heal_once; then
            log "Heal failed, retrying in 60 seconds..."
            sleep 60
        fi
        sleep 300  # Check every 5 minutes
    done
}

main "$@"
