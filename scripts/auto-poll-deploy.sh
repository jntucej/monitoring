#!/bin/bash
# Auto-poll GitHub for changes and deploy
# Runs on server, initiates outbound connection (works through NAT/firewall)

REPO_DIR="/opt/monitoring/compose"
LOG_FILE="/var/log/gate-monitor-deploy.log"
CHECK_INTERVAL=300  # 5 minutes

last_hash=$(cd "$REPO_DIR" && git rev-parse HEAD 2>/dev/null || echo "")

while true; do
    echo "[$(date)] Checking for updates..." >> "$LOG_FILE"
    
    current_hash=$(cd "$REPO_DIR" && git rev-parse HEAD 2>/dev/null || echo "")
    
    # Fetch latest
    git fetch origin >> "$LOG_FILE" 2>&1
    remote_hash=$(git rev-parse origin/main 2>/dev/null || echo "")
    
    if [ "$remote_hash" != "$current_hash" ] && [ -n "$remote_hash" ]; then
        echo "[$(date)] New commit detected: $remote_hash" >> "$LOG_FILE"
        echo "[$(date)] Deploying..." >> "$LOG_FILE"
        
        # Deploy
        cd "$REPO_DIR"
        git reset --hard origin/main >> "$LOG_FILE" 2>&1
        
        rsync -av --delete \
            --exclude='.git' --exclude='node_modules' --exclude='.next' \
            --exclude='.env' --exclude='.env.*' \
            src/ /opt/monitoring/compose/src/ >> "$LOG_FILE" 2>&1
        
        docker compose build web --no-cache >> "$LOG_FILE" 2>&1
        docker compose up -d --remove-orphans >> "$LOG_FILE" 2>&1
        
        # Wait for healthy
        for i in $(seq 1 30); do
            STATUS=$(docker inspect --format="{{.State.Health.Status}}" gate_web 2>/dev/null || echo "missing")
            if [ "$STATUS" = "healthy" ]; then
                echo "[$(date)] Deploy successful!" >> "$LOG_FILE"
                break
            fi
            sleep 5
        done
    fi
    
    sleep $CHECK_INTERVAL
done
