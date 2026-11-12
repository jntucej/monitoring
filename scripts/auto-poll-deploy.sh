#!/bin/bash
# Auto-poll GitHub for changes and deploy
# Runs on server, initiates outbound connection (works through NAT/firewall)
#
# Rollback: if the new build fails its health check within 60s, the script
# restores the previous image tag and recreates the container. The poller
# stays alive — build failures skip this cycle and retry next cycle.

BASE_DIR="/opt/monitoring"
DEPLOY_DIR="${BASE_DIR}"
REPO_DIR="${BASE_DIR}/compose"
ENV_FILE="${BASE_DIR}/env/production.env"
COMPOSE=(docker compose --project-directory "${BASE_DIR}" \
         -f "${REPO_DIR}/docker-compose.yml" --env-file "${ENV_FILE}")
LOG_FILE="/var/log/gate-monitor-deploy.log"
CHECK_INTERVAL=300  # 5 minutes
COMPOSE_FILE="/opt/monitoring/compose/docker-compose.yml"
ENV_FILE="/opt/monitoring/env/production.env"

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
        
        # C3: rsync the WHOLE tree (not just src/). The compose bind mounts,
        # migration SQL, and scripts all resolve against ${DEPLOY_DIR}, so
        # deploying only src/ against stale migrations/compose is worse
        # than not deploying at all.
        rsync -av --delete \
            --exclude='.git' --exclude='node_modules' --exclude='.next' \
            --exclude='.env' --exclude='.env.*' \
            "$REPO_DIR/" "$DEPLOY_DIR/" >> "$LOG_FILE" 2>&1

        "${COMPOSE[@]}" build web --no-cache >> "$LOG_FILE" 2>&1
        "${COMPOSE[@]}" up -d --remove-orphans >> "$LOG_FILE" 2>&1
        
        # Wait for healthy
        for i in $(seq 1 30); do
            STATUS=$(docker inspect --format='{{.State.Health.Status}}' gate_web 2>/dev/null || echo "missing")
            if [ "$STATUS" = "healthy" ]; then
                HEALTHY=true
                break
            fi
            sleep 2
        done

        if [ "$HEALTHY" = "true" ]; then
            echo "[$(date)] Deploy successful!" >> "$LOG_FILE"
        else
            echo "[$(date)] HEALTH FAILED — new build not healthy within 60s" >> "$LOG_FILE"
            if [ -n "$OLD_IMAGE" ] && [ "$OLD_IMAGE" != "none" ]; then
                echo "[$(date)] Rolling back to $OLD_IMAGE" >> "$LOG_FILE"
                docker tag "$OLD_IMAGE" monitoring-web:latest >> "$LOG_FILE" 2>&1
                docker compose --file "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate web >> "$LOG_FILE" 2>&1
                sleep 5
                RESTORED=$(docker inspect --format='{{.State.Health.Status}}' gate_web 2>/dev/null || echo "missing")
                echo "[$(date)] ROLLBACK result: $RESTORED" >> "$LOG_FILE"
                if [ "$RESTORED" != "healthy" ]; then
                    echo "[$(date)] WARNING: rollback did not restore health (status: $RESTORED). HUMAN INTERVENTION REQUIRED." >> "$LOG_FILE"
                fi
            else
                echo "[$(date)] WARNING: no previous image to roll back to. HUMAN INTERVENTION REQUIRED." >> "$LOG_FILE"
            fi
        fi
    fi

    sleep $CHECK_INTERVAL
done
