# Contributing

Workflow for the 4-person team. Full model: [docs/BRANCHING.md](docs/BRANCHING.md).

## Branching

- `main` is protected: **no direct pushes** (except Akarsh for emergencies). Everything lands via PR.
- Use short-lived branches off `main`, named with the Jira key:

  ```
  feature/FS-123-login-page
  bugfix/QA-45-cart-total
  infra/IS-12-vpc-setup
  hotfix/IT-99-payment-error
  test/QA-7-scan-e2e        (optional, Dhanavarsha)
  ```

- No `develop` / `release/*` unless we adopt batch releases.
- **Prefixes are lowercase and case-sensitive.** `feature/FS-1-x` passes the CI
  check; `Feature/FS-1-x` fails. After the `/`, the token must be letters,
  digits, `.`, `_`, or `-` (any case) and cannot be empty.

## Pull requests

1. Branch off latest `main`.
2. Open a PR → `main`.
3. Get **1 approval** (dismissed if you push more commits).
4. Resolve all conversation threads before merge.
5. Check the **QA Evidence** sticky comment → artifact on the workflow run.
6. Squash-merge. **Never merge with a red check.**

CI (GitHub Free — see [docs/GITHUB_FREE_SETUP.md](docs/GITHUB_FREE_SETUP.md)):

- `Branch name guard` — fails if the branch doesn't match the convention above.
- `QA Evidence` — uploads `qa-evidence-pr-<n>` (30-day retention) and comments the link.

## Who reviews what (CODEOWNERS)

| Path | Owner |
|---|---|
| `*` | @Akarshjadi |
| `/infra/` | @junaidshaik7798-crypto |
| `/tests/` | @Dhanavarshaponnala-dev |
| `/src/` | @MoolaAshwitha21 |

## Access

| Person | Access |
|---|---|
| Akarsh | Admin |
| Ashwitha | Write |
| Junaid | Maintain |
| Dhanavarsha | Write (commits automated tests) |

## Do not commit

Scratch dumps (`*.txt` dumps, one-off `print_*.js`), `__pycache__/`, `.DS_Store`,
`.continue/` (contains credentials), `supabase/.temp/`, `.env*`. See `.gitignore`.

Jira labels (IT/FS/IS/QA) only organize Jira — they don't grant GitHub access.
