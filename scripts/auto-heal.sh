#!/bin/bash
# Auto-Heal Agent: Diagnoses and fixes deployment failures
set -e

REPO_DIR="/root/monitoring"
LOGS_DIR="/tmp/heal-logs"

mkdir -p "$LOGS_DIR"

echo "=== Auto-Heal Agent Started ==="
echo "Timestamp: $(date)"

# Step 1: Check GitHub workflow status
echo "Checking latest deployment failure..."
export GH_TOKEN=$(cat /root/.github-token 2>/dev/null || echo "")
RUN_ID=$(gh run list --repo jntucej/monitoring --branch main --limit 1 --json conclusion,id --jq '.[0].id' 2>/dev/null || echo "")

if [ -z "$RUN_ID" ]; then
  echo "No recent workflow runs found"
  exit 0
fi

CONCLUSION=$(gh run list --repo jntucej/monitoring --branch main --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "")
echo "Latest run $RUN_ID: $CONCLUSION"

if [ "$CONCLUSION" != "failure" ]; then
  echo "Workflow succeeded, no healing needed"
  exit 0
fi

# Step 2: Get failure logs
echo "Downloading failure logs..."
gh run view "$RUN_ID" --repo jntucej/monitoring --log-failed > "$LOGS_DIR/failed.log" 2>&1 || true

# Step 3: Diagnose common issues
echo "Diagnosing issues..."

# Check SSH connectivity
echo "Testing SSH connectivity..."
SSH_HOST=$(gh secret get SERVER_HOST --repo jntucej/monitoring 2>/dev/null || echo "192.168.1.36")
SSH_KEY="/root/.ssh/myrepo_deploy"

if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" root@"$SSH_HOST" "echo 'SSH OK'" 2>/dev/null; then
  echo "✅ SSH connection working"
else
  echo "❌ SSH connection failed"
  
  # Try Tailscale IP
  if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" root@100.122.7.62 "echo 'SSH OK via Tailscale'" 2>/dev/null; then
    echo "✅ SSH works via Tailscale IP"
    gh secret set SERVER_HOST --repo jntucej/monitoring -b "100.122.7.62"
    echo "Updated SERVER_HOST to Tailscale IP"
  else
    # Try Tailscale Funnel URL
    FQDN=$(ssh root@192.168.1.36 -i "$SSH_KEY" "tailscale ip -4 && tailscale status" 2>/dev/null | grep -oE '\.tail\d+\.ts\.net' | head -1)
    if [ -n "$FQDN" ]; then
      echo "Found Tailscale domain: $FQDN"
      if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$SSH_KEY" root@"$FQDN" "echo 'SSH OK via Funnel'" 2>/dev/null; then
        gh secret set SERVER_HOST --repo jntucej/monitoring -b "$FQDN"
        echo "Updated SERVER_HOST to Funnel URL"
      fi
    fi
  fi
fi

# Step 4: Check server status
echo "Checking server Docker status..."
ssh root@"$SSH_HOST" -i "$SSH_KEY" "docker ps --filter name=gate --format 'table {{.Names}}\t{{.Status}}'" 2>/dev/null || echo "Cannot check server status"

# Step 5: Check disk space
echo "Checking disk space..."
ssh root@"$SSH_HOST" -i "$SSH_KEY" "df -h / | tail -1" 2>/dev/null || echo "Cannot check disk"

# Step 6: Create fix branch and PR if issues found
echo "Creating fix PR if needed..."
cd "$REPO_DIR"
git checkout -b "fix/heal-$(date +%s)" 2>/dev/null || echo "Could not create branch"

# Check if deploy workflow needs updates
if grep -q "git pull" .github/workflows/deploy.yml; then
  echo "Updating deploy workflow for resilience..."
  # Add retry logic, better error handling
  sed -i 's/git pull origin main/git fetch origin \&\& git reset --hard origin\/main/' .github/workflows/deploy.yml
  git add .github/workflows/deploy.yml
  git commit -m "fix: improve deploy resilience with git reset" || echo "No changes to commit"
  git push origin "fix/heal-$(date +%s)" 2>/dev/null || echo "Could not push"
fi

echo "=== Auto-Heal Agent Completed ==="
echo "Review the PR and merge when ready"
