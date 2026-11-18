# Workflow Architecture

## Design Principles

- **Few, clearly owned workflows** with explicit contracts.
- **Blocking vs advisory** checks separated: blocking gates fail the merge;
  advisory checks report but do not block.
- **Single source of truth** for scan reports: only the owning workflow
  publishes artifacts.
- **Least-privilege secrets**: CI and deployment use separate credentials.
- **Immutable references**: images tagged by commit SHA, signed with cosign.

## PR / Push Gates

| Workflow | File | Jobs | Blocking? |
|---|---|---|---|
| CI | `ci.yml` | build-and-test | Yes (typecheck, jest, playwright) |
| Database | `database.yml` | migration-and-rls | Yes (migrations, RLS, audit, role scoping) |
| Security | `security.yml` | secret-scan, trivy-npm, trivy-images, compose-security, falco-rules | Yes (gitleaks, trivy npm, compose) / Advisory (trivy images, falco) |
| Infrastructure | `infrastructure.yml` | compose-boot, performance, console-independence | Yes (boot, perf budget, independence) |

### Advisory (non-blocking)
- Lint (react-hooks debt tracked separately)
- Unslop UI audit
- Trivy container image scan (CVEs in upstream images)
- Falco rules validation
- Schema drift (weekly, opens issue on drift)

## Deployment

| Workflow | File | Trigger | Protection |
|---|---|---|---|
| Deploy | `deploy.yml` | push to main + manual dispatch | GitHub Environment `production` + concurrency |
| Release | `release.yml` | push to main + release | cosign keyless OIDC signing |

### Deployment protection
- **GitHub Environment `production`**: required reviewers before deploy.
- **Concurrency**: `group: production`, `cancel-in-progress: false`.
- **Telegram**: notification only (not a deploy trigger).
- **auto-heal**: removed. Diagnostics live in deploy.yml health check.

## Maintenance

| Workflow | File | Trigger |
|---|---|---|
| Maintenance | `maintenance.yml` | weekly cron + manual dispatch |

Jobs:
- `schema-drift` - weekly, advisory (opens issue on drift)
- `regenerate-schema` - manual dispatch only
- `artifact-cleanup` - weekly cron
- `workflow-verify` - weekly cron (re-runs role/permission checks)

## Removed Workflows

| Old File | Replaced By |
|---|---|
| `gate-test.yml` | `ci.yml` (build-and-test job) |
| `migration-check.yml` | `database.yml` |
| `verify-workflows.yml` | `maintenance.yml` (workflow-verify) |
| `trivy-security.yml` | `security.yml` |
| `infrastructure-guardrail.yml` | `infrastructure.yml` (compose-boot) |
| `perf.yml` | `infrastructure.yml` (performance) |
| `manual-deploy.yml` | `deploy.yml` (workflow_dispatch) |
| `telegram-deploy.yml` | `deploy.yml` (notification only) |
| `auto-heal.yml` | removed (diagnostics in deploy.yml) |
| `branch-name.yml` | removed (branch naming enforced by branch protection) |
| `supply-chain.yml` | `release.yml` |
| `cleanup-artifacts.yml` | `maintenance.yml` (artifact-cleanup) |
| `schema-drift.yml` | `maintenance.yml` (schema-drift) |
| `regenerate-schema.yml` | `maintenance.yml` (regenerate-schema) |

## Pinned Actions

All third-party actions pinned to commit SHAs:
- `actions/checkout@11d5960a` (v4)
- `actions/setup-node@49933ea5` (v4)
- `actions/upload-artifact@ea165f8d` (v4)
- `actions/github-script@v7` (used in maintenance.yml)

Scanner downloads:
- gitleaks v8.30.1 (pinned release URL)
- trivy (official install.sh, latest release)
- yq (latest release)

## Required Secrets

| Secret | Used By | Rotation |
|---|---|---|
| `SERVER_HOST` | deploy.yml | on IP change |
| `SERVER_USER` | deploy.yml | on user change |
| `SSH_PRIVATE_KEY` | deploy.yml | 90-day rotation |
| `TELEGRAM_CHAT_ID` | deploy.yml | rarely |
| `TELEGRAM_BOT_TOKEN` | deploy.yml | 30-day rotation |
| `PROD_SCHEMA_READER_URL` | maintenance.yml (drift) | on credential rotation |
