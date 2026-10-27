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

        # Refuse to touch the tree if there are uncommitted local changes.
        cd "$REPO_DIR"
        local_changes=$(git status --porcelain | wc -l)
        if [ "$local_changes" -ne 0 ]; then
            echo "[$(date)] Refusing deploy: $local_changes uncommitted local change(s) present. Stashing first." >> "$LOG_FILE"
            git stash push -u -m "auto-poll-deploy: pre-deploy stash" >> "$LOG_FILE" 2>&1 || {
                echo "[$(date)] ERROR: could not stash local changes; aborting deploy this cycle." >> "$LOG_FILE"
                sleep $CHECK_INTERVAL
                continue
            }
        fi

        echo "[$(date)] Deploying..." >> "$LOG_FILE"

        # Use pull --rebase so we never lose local commits and always track
        # the newest remote, not a stale origin/main from a failed fetch.
        git pull --rebase --autostash >> "$LOG_FILE" 2>&1 || {
            echo "[$(date)] ERROR: git pull --rebase failed; aborting deploy this cycle." >> "$LOG_FILE"
            git stash pop >> "$LOG_FILE" 2>/dev/null
            sleep $CHECK_INTERVAL
            continue
        }
        
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
