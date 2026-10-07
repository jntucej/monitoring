# GitHub Free Organization Setup

How the organization, approval workflow, and QA evidence are wired on the
**free** plan. Branch types, access matrix, and CODEOWNERS already live in
[BRANCHING.md](BRANCHING.md) — this file only covers what that does not.

## 1. Organization & access

Free org = unlimited members + Teams. Grant access via Teams so permission is
managed in one place (and so adding one person never silently grants them more
than intended):

| Team | Members | Repo access | Why |
|---|---|---|---|
| `leads` | Akarsh | Admin | Settings, secrets, merge authority |
| `developers` | Ashwitha, Junaid | Write | Feature / infra branches |
| `qa` | Dhanavarsha | **Write** | Pushes `test/*` branches and Playwright specs — the QA workflow needs them in the repo |

Access level and enforcement are **separate** free-plan limitations, don't
conflate them:

- **Access level** — you *can* grant Read or Write (per person or via Teams).
- **Enforcement** — you *cannot* enable branch protection rules (required
  reviewers / required status checks) on a private repo. Those are paid.

So Dhanavarsha gets Write; what stops a bad merge is the CI checks plus the team
rule in §3, not a GitHub setting.

## 2. Keep branches after merge

**Settings → General → Pull Requests → "Automatically delete head branches" = OFF.**
Nothing is deleted automatically; clean up manually when you want.

## 3. Approval workflow

Free private repos do **not** support enforced branch protection (required
reviewers / required status checks are paid). Enforcement is CI + discipline:

1. Branch `feature/FS-123-...` off `main`.
2. Push, open a PR into `main`.
3. CI runs (`.github/workflows/branch-name.yml` + `qa-evidence.yml`).
4. Akarsh reviews the diff **and the QA evidence artifact link**.
5. Approve → merge. The branch stays.

Team rule: **never merge a PR with a red check.**

## 4. Workflows

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/branch-name.yml` | PR open/sync/reopen/edit | Fails if the branch name is not `feature|bugfix|hotfix|infra|test` |
| `.github/workflows/qa-evidence.yml` | PR open/sync/reopen | Runs tests, uploads `qa-evidence-pr-<n>` artifact with `if: always()`, posts a sticky PR comment linking to it. Comment step is skipped on fork PRs (`pull-requests: write` is downgraded there) |
| `.github/workflows/cleanup-artifacts.yml` | Weekly (Sun 03:00 UTC) + manual | Deletes artifacts older than 30 days |

## 5. Artifact storage (the 500 MB trap)

- **500 MB** total artifact storage per org. Exceed it and **all** uploads are blocked.
- Default retention is **90 days** — every workflow here sets **30**.

Policy:

| Knob | Setting |
|---|---|
| Retention | 30 days |
| Screenshots | Compress to WebP/JPEG |
| Videos | Only on failure |
| Cleanup | Weekly workflow deletes >30-day artifacts |

Also set a default in **Organization Settings → Actions → General** so new
workflows inherit a short retention.

Artifact layout (written during the QA step, uploaded in the next step):

| Path | Contents |
|---|---|
| `qa-evidence/INDEX.txt` | One-line note that this is the evidence bundle for the run |
| `qa-evidence/reports/junit.xml` | Machine-readable test report (once Playwright specs exist) |
| `qa-evidence/reports/README.txt` | Placeholder marker while there are no specs yet |
| `qa-evidence/screenshots/` | Traces, screenshots, videos (`--output` target, `--trace=retain-on-failure`) |

If `junit.xml` is missing, the run shows a yellow `::warning::` annotation rather than
silently shipping a bundle without its report.

## 6. Project tracking

GitHub Projects is free (Table / Board / Roadmap, 1,200 items). Link the project
to the repo and track issues + PRs there.