#!/usr/bin/env bash
# apply-branch-rules.sh — Apply branch protection rules to jntucej/monitoring
# Usage: ./apply-branch-rules.sh [--dry-run]

set -e

REPO="jntucej/monitoring"
BRANCH="main"
DRY_RUN=false

if [[ "${1}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "[dry-run] No changes will be made."
fi

# Check gh CLI
if ! command -v gh &>/dev/null; then
  echo "ERROR: 'gh' CLI not found. Install it: https://cli.github.com/"
  exit 1
fi

# Ensure authenticated
gh auth status &>/dev/null || {
  echo "ERROR: gh is not authenticated. Run: gh auth login"
  exit 1
}

echo "=== Current branch protection for ${BRANCH} ==="
gh api "repos/${REPO}/branches/${BRANCH}/protection" 2>/dev/null \
  | jq '.required_status_checks, .required_pull_request_reviews, .enforce_admins' \
  || echo "  No protection rules configured yet."

echo ""
echo "=== Applying branch protection rules ==="

RULES=(
  # 1. Require pull request reviews before merging
  'pull_requests={"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}'
  # 2. Require status checks to pass before merging
  'status_checks={"strict":true,"contexts":["ci","test","lint","build","security-check"]}'
  # 3. Enforce for administrators
  'admin_enforcement=true'
  # 4. Restrict who can push
  'restrictions={"users":[],"teams":[],"apps":[]}'
)

# Build JSON payload
PAYLOAD=$(jq -n \
  --arg pr "${RULES[0]}" \
  --arg sc "${RULES[1]}" \
  --arg ae "${RULES[2]}" \
  --arg rs "${RULES[3]}" \
  '{required_pull_request_reviews:($pr|fromjson),required_status_checks:($sc|fromjson),enforce_admins:($ae|fromjson),restrictions:($rs|fromjson)}')

echo "$PAYLOAD" | jq .

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] Would execute:"
  echo "  gh api repos/${REPO}/branches/${BRANCH}/protection \
    -f 'req=${PAYLOAD//'"'/'\''"}' \
    -X PUT"
else
  echo "Applying rules..."
  # Use form-data to avoid shell escaping issues
  gh api "repos/${REPO}/branches/${BRANCH}/protection" \
    -f "required_pull_request_reviews=${RULES[0]}" \
    -f "required_status_checks=${RULES[1]}" \
    -f "enforce_admins=${RULES[2]}" \
    -f "restrictions=${RULES[3]}" \
    -X PUT && echo "Done."
fi

echo ""
echo "=== Rules that may cause failures ==="
echo "1. [pull_requests] Requires 1 approving review — PR without reviewer will be blocked"
echo "2. [status_checks] Requires all listed CI checks to pass — missing check will block merge"
echo "3. [restrictions] Restricts who can push directly — non-whitelisted users blocked"
echo "4. [admin_enforcement] Applies rules even to admins — admin direct push also blocked"
echo ""
echo "=== How to rollback ==="
echo "  gh api repos/${REPO}/branches/${BRANCH}/protection/enforce_admins -X DELETE"
echo "  gh api repos/${REPO}/branches/${BRANCH}/protection/required_pull_request_reviews -X DELETE"
echo "  gh api repos/${REPO}/branches/${BRANCH}/protection/required_status_checks -X DELETE"
echo "  gh api repos/${REPO}/branches/${BRANCH}/protection/restrictions -X DELETE"
