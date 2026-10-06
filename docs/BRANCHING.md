# Branching Model

For a **4-person team**, don't copy a big enterprise branching model. Keep it simple:
**one protected `main` branch + short-lived branches**. Add `develop` or `release/*`
only if you actually have scheduled releases and QA needs a stable integration branch.

## 1. Branch types you actually need

| Branch | Needed? | Who uses it | Merges into |
|---|---|---|---|
| `main` | ✅ Yes | Everyone (via PR) | — |
| `feature/*` | ✅ Yes | Ashwitha, Akarsh | `main` or `develop` |
| `bugfix/*` | ✅ Yes | Anyone | `main` or `develop` |
| `hotfix/*` | ✅ Yes | Akarsh / Junaid | `main` |
| `infra/*` | ✅ Yes | Junaid | `main` |
| `test/*` or `qa/*` | Optional | Dhanavarsha | `main` or `develop` |
| `develop` | Optional | Everyone | `main` |
| `release/*` | Optional | Akarsh | `main` + `develop` |
| `support/*` | Usually no | — | — |

**Recommended for this team:**

- Permanent: `main`
- Short-lived: `feature/*`, `bugfix/*`, `hotfix/*`, `infra/*`, `test/*`
- Add `develop` only if you release in batches.
- Add `release/*` only if you do versioned releases.

### Branch naming with Jira

```
feature/FS-123-login-page
bugfix/QA-45-cart-total
infra/IS-12-vpc-setup
hotfix/IT-99-payment-error
```

Jira role labels (`IT`, `FS`, `IS`, `QA`) are for Jira filtering — they don't control
GitHub access. Map them to GitHub teams/roles manually.

## 2. GitHub access levels for the 4 members

> If this is a **personal repo**, you only get **Read / Write / Admin**.
> If it's an **organization repo**, you get **Read / Triage / Write / Maintain / Admin**.
> Use an organization if you want Triage/Maintain roles.

| Person | Role | GitHub access | Why |
|---|---|---|---|
| **Akarsh** | Solutions Architect & Technical Lead | **Admin** | Manages repo settings, secrets, branch protection, releases |
| **Ashwitha** | Full-Stack & Product Engineer | **Write** | Push feature branches, open PRs, merge after review |
| **Junaid** | Infrastructure, Cloud & Cyber Security | **Maintain** | Manages Actions, environments, secrets; Write if only code |
| **Dhanavarsha** | QA | **Write** | Commits automated tests under `/tests/` (keep `main` protected) |

Minimum safe setup: 1 Admin (Akarsh), 2 Write (Ashwitha, Dhanavarsha), 1 Maintain (Junaid).

If Dhanavarsha later only reports bugs and runs manual tests → demote to **Triage**.

## 3. Branch protection rules (enabled on `main`)

- Require pull request before merging
- Require at least **1 approval**
- Dismiss stale approvals when new commits are pushed
- Require status checks to pass
- Require conversation resolution
- No force pushes
- No deletions
- Restrict who can push directly (only Akarsh, if absolutely needed)

If you use `develop`, protect it the same way but allow merges from `feature/*`.

## 4. GitHub teams (only if using an organization)

| Team | Members | Repo permission |
|---|---|---|
| `leads` | Akarsh | Admin |
| `devs` | Ashwitha, Junaid | Write |
| `qa` | Dhanavarsha | Triage or Write |
| `security` | Junaid | Maintain + Org Security Manager (optional) |

## 5. CODEOWNERS

Only users with **Write** access can be code owners. See
[`.github/CODEOWNERS`](../.github/CODEOWNERS).

```
*                   @Akarshjadi
/infra/             @junaidshaik7798-crypto
/tests/             @Dhanavarshaponnala-dev
/src/               @MoolaAshwitha21
```

## Bottom line for 4 members

- **Branches:** `main` + `feature/*` + `bugfix/*` + `hotfix/*` + `infra/*` + optional `test/*`.
- **Access:** Akarsh = Admin, Ashwitha = Write, Junaid = Maintain, Dhanavarsha = Write.
- **Protect `main`** with PR reviews and status checks.
- Add `develop` / `release/*` only when your release process truly needs them.

## Production branch

`main` is the production branch. Vercel (or CI) should be connected to `main` so every
merge deploys automatically.
