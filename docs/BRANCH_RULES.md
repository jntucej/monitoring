# Branch Protection Rules

## Overview

Branch protection rules prevent accidental force-pushes, enforce code review, and require CI checks before merging. Misconfiguration can **block legitimate merges**.

---

## Recommended Rules (safe to apply)

| Rule | Purpose | Risk if wrong |
|------|---------|---------------|
| Require PR reviews | At least 1 approving review | Blocks merge if no reviewer |
| Require status checks | CI must pass (lint, test, build) | Blocks merge if check fails/missing |
| Enforce for admins | Rules apply to repo owners too | Admins can't bypass |
| Restrict pushes | Only whitelisted users/teams | Direct push blocked |
| Include administrators | No one is exempt | Admin direct-commits blocked |

---

## Check Current Rules

```bash
# Check all protection settings for 'main'
gh api repos/jntucej/monitoring/branches/main/protection

# Check specific sub-rules
gh api repos/jntucej/monitoring/branches/main/protection/required_status_checks
gh api repos/jntucej/monitoring/branches/main/protection/required_pull_request_reviews
gh api repos/jntucej/monitoring/branches/main/protection/enforce_admins
gh api repos/jntucej/monitoring/branches/main/protection/restrictions
```

---

## Apply Rules

```bash
# Option 1: Use the helper script
chmod +x docs/scripts/apply-branch-rules.sh
./docs/scripts/apply-branch-rules.sh          # live mode
./docs/scripts/apply-branch-rules.sh --dry-run  # preview first

# Option 2: Manual gh CLI commands
gh api repos/jntucej/monitoring/branches/main/protection \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  -f required_status_checks='{"strict":true,"contexts":["ci","build"]}' \
  -f enforce_admins=true \
  -X PUT
```

---

## Rollback Rules (if they break things)

```bash
# Disable enforcement
gh api repos/jntucej/monitoring/branches/main/protection/enforce_admins -X DELETE

# Remove review requirement
gh api repos/jntucej/monitoring/branches/main/protection/required_pull_request_reviews -X DELETE

# Remove status check requirement
gh api repos/jntucej/monitoring/branches/main/protection/required_status_checks -X DELETE

# Remove push restrictions
gh api api repos/jntucej/monitoring/branches/main/protection/restrictions -X DELETE

# Re-enable direct push (emergency only)
gh api repos/jntucej/monitoring/branches/main/protection -X DELETE
```

---

## CI Checks Required by Rules

Make sure your GitHub Actions workflow includes these statuses so the branch rule doesn't block merges:

```yaml
# .github/workflows/deploy.yml — job names must match required status checks
jobs:
  deploy:          # status: "deploy"
  ci-build:        # status: "ci"
  lint:             # status: "lint"
```

If a status check is missing, the merge button stays disabled.

---

## Troubleshooting

### "This branch has a protection rule" — can't push
```bash
# Emergency: remove all protections
gh api repos/jntucej/monitoring/branches/main/protection -X DELETE
```

### Status check failing but CI passed
Check which check name the rule expects vs what GitHub Actions reports:
```bash
gh api repos/jntucej/monitoring/branches/main/protection/required_status_checks
```
Match the `contexts` array with the actual job `name:` fields in your workflow YAML.

### Admin can't merge own PR
Rules with `enforce_admins: true` apply to everyone. Disable with:
```bash
gh api repos/jntucej/monitoring/branches/main/protection/enforce_admins -X DELETE
```
