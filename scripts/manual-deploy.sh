#!/bin/bash
# Manual Deploy Script - Bypass GitHub Actions
# Usage: ./deploy.sh [environment]
# Environment: production (default), staging

set -e

ENVIRONMENT=${1:-production}
SERVER_HOST="192.168.1.36"
SSH_KEY="$HOME/.ssh/myrepo_deploy"
REMOTE_DIR="/opt/monitoring/compose"

echo "=== Manual Deploy Script ==="
echo "Environment: $ENVIRONMENT"
echo "Server: $SERVER_HOST"
echo "Timestamp: $(date)"
echo ""

# Step 1: Health check
echo "=== Step 1: Health Check ==="
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" root@"$SERVER_HOST" "echo 'SSH OK'" 2>/dev/null; then
    echo "❌ SSH connection failed"
    exit 1
fi
echo "✅ SSH connection successful"
echo ""

# Step 2: Pull latest code
echo "=== Step 2: Pull Latest Code ==="
ssh -o ConnectTimeout=30 -o StrictHostKeyChecking=no -i "$SSH_KEY" root@"$SERVER_HOST" "
  cd $REMOTE_DIR
  git fetch origin
  CURRENT_HASH=\$(git rev-parse HEAD)
  NEW_HASH=\$(git rev-parse origin/main)
  echo \"Current: $CURRENT_HASH\"
  echo \"Remote: $NEW_HASH\"
  if [ \"$CURRENT_HASH\" = \"$NEW_HASH\" ]; then
    echo \"Already up to date\"
  else
    git reset --hard origin/main
    echo \"Updated to $NEW_HASH\"
  fi
"
echo ""

# Step 3: Build and deploy
echo "=== Step 3: Build and Deploy ==="
ssh -o ConnectTimeout=300 -o StrictHostKeyChecking=no -i "$SSH_KEY" root@"$SERVER_HOST" "
  cd $REMOTE_DIR
  docker compose build web --no-cache
  docker compose up -d --remove-orphans
  
  echo 'Waiting for healthy...'
  for i in \$(seq 1 30); do
    STATUS=\$(docker inspect --format='{{.State.Health.Status}}' gate_web 2>/dev/null || echo 'missing')
    if [ \"\$STATUS\" = 'healthy' ]; then
      echo 'Container is healthy!'
      break
    fi
    sleep 5
  done
  
  docker logs gate_web --tail 5
"
echo ""

# Step 4: Verify deployment
echo "=== Step 4: Verify Deployment ==="
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" root@"$SERVER_HOST" "
  echo 'Container Status:'
  docker ps --filter name=gate --format 'table {{.Names}}\t{{.Status}}'
  echo ''
  echo 'Git Status:'
  cd $REMOTE_DIR && git log -1 --oneline
"
echo ""

echo "=== Deploy Complete ==="
echo "Timestamp: $(date)"
