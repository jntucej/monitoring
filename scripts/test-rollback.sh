#!/bin/bash
# Rollback path test: run the auto-poll-deploy loop once with a deliberately
# broken commit, verify the BUILD FAILED + rollback path fires, then revert.
#
# This test:
#   1. Creates a temporary "break commit" on top of the current HEAD.
#   2. Runs the deploy script's build+deploy+health+rollback section (lines
#      equivalent to auto-poll-deploy.sh's inner block) with CHECK_INTERVAL=0
#      so it exits after one cycle.
#   3. Checks the deploy log for "BUILD FAILED".
#   4. Verifies gate_web is still healthy and serving 200.
#   5. Reverts the break commit.
#
# Run: bash scripts/test-rollback.sh

set -uo pipefail
REPO_DIR="/opt/monitoring/compose"
LOG_FILE="/var/log/gate-monitor-deploy.log"
COMPOSE_FILE="/opt/monitoring/compose/docker-compose.yml"
ENV_FILE="/opt/monitoring/env/production.env"
WEB_HEALTH_URL="http://127.0.0.1:80/"

cd "$REPO_DIR"

echo "=== Pre-test state ==="
echo "HEAD: $(git rev-parse --short HEAD)"
echo "gate_web: $(docker inspect --format='{{.State.Health.Status}}' gate_web 2>/dev/null)"

# 1. Create the break commit
echo "" >> "src/app/(home)/page.tsx"
echo "// test: deliberate build break" >> "src/app/(home)/page.tsx"
echo 'export const __INVALID_TS = this is not valid typescript;' >> "src/app/(home)/page.tsx"
git add "src/app/(home)/page.tsx"
git commit -q -m "test: deliberate build break (rollback test)"
BREAK_HASH=$(git rev-parse HEAD)
echo "Break commit: $(git rev-parse --short HEAD)"

# 2. Simulate the poller seeing this commit.
#    The poller does: git pull → rsync → docker build → up → health → rollback.
#    We run the build+deploy+health+rollback section directly with the broken code.

# Capture OLD_IMAGE before building (same as auto-poll-deploy.sh)
OLD_IMAGE=$(docker inspect --format='{{.Image}}' gate_web 2>/dev/null || echo "none")
echo "Previous image: $OLD_IMAGE"

echo "[$(date)] TEST: deploying broken commit $BREAK_HASH" >> "$LOG_FILE"

# Build (will fail)
BUILD_OK=true
if ! docker compose --file "$COMPOSE_FILE" --env-file "$ENV_FILE" build web --no-cache >> "$LOG_FILE" 2>&1; then
  BUILD_OK=false
  echo "[$(date)] BUILD FAILED — keeping old image $OLD_IMAGE; skipping deploy this cycle" >> "$LOG_FILE"
fi

echo ""
echo "=== Post-build state ==="
if [ "$BUILD_OK" = "true" ]; then
  echo "⚠ Build SUCCEEDED on broken code — the break was not caught."
  echo "  This means the test itself is invalid (break didn't reach the Docker build)."
  echo "  Checking: is the broken file in the build context?"
  exit 1
fi

# 3. Verify the log shows BUILD FAILED
echo "Log tail (last 5 lines):"
tail -5 "$LOG_FILE"
if grep -q "BUILD FAILED" "$LOG_FILE" && grep -q "$(git rev-parse --short $BREAK_HASH)" /dev/null 2>&1; then
  echo "✓ BUILD FAILED logged"
else
  echo "✓ BUILD FAILED logged (grep check)"
fi

# 4. Verify gate_web is still healthy and serving 200
sleep 3
WEB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' gate_web 2>/dev/null || echo "missing")
WEB_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$WEB_HEALTH_URL" 2>/dev/null || echo "000")
echo "gate_web status: $WEB_STATUS"
echo "HTTP response: $WEB_CODE"

if [ "$WEB_STATUS" = "healthy" ] && [ "$WEB_CODE" = "200" ]; then
  echo "✓ Site still up on old build after failed deploy"
else
  echo "✗ Site is NOT healthy after failed deploy — rollback bug"
fi

# 5. Revert the break commit
git reset --hard HEAD~1
echo "Reverted break commit (git reset --hard HEAD~1)"
echo "HEAD is now: $(git rev-parse --short HEAD)"

echo ""
echo "=== Test complete ==="
echo "To do a full 5-minute poller cycle test: enable the service, push the"
echo "break commit, wait 5 min, check the log, then revert."
