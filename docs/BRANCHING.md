Branching Model

**4-person team**, don't copy big enterprise branching model. Keep simple:
**one protected `main` branch, short-lived branches**. Add `develop` / `release/*`
only if actually scheduled releases need stable integration branch.

1. Branch types actually need

| Branch | Needed? | Who uses | Merges |
|---|---|---|---|
| `main` | Yes | Everyone (direct commit) | - |
| `feature/*` | Yes | Ashwitha, Akarsh | `main` |
| `bugfix/*` | Yes | Anyone | `main` |
| `hotfix/*` | Yes | Akarsh / Junaid | `main` |
| `infra/*` | Yes | Junaid | `main` |
| `test/*` / `qa/*` | Optional | Dhanavarsha | `main` |
| `develop` | Optional | Everyone | `main` |
| `release/*` | Optional | Akarsh | `main` + `develop` |
| `support/*` | Optional | Anyone | `main` |

**Recommended team:**
- Permanent: `main` (direct commit)
- Short-lived: `feature/*`, `bugfix/*`, `hotfix/*`, `infra/*`, `test/*`
- Add `develop` only if release batches need it
- Add `release/*` only for versioned releases

### Branch naming (Jira)

```
| featur| featur|login-pa| featur| featur|login-pa| featur| featur|login-pa| featur| featur|login--p| featur| featur|login-pa| featur| featur|login-pa| featur| featur|login-pa| feat but don't control
GitHub access. Map GitHub teams/roles manually.

2. 2. 2. 2. 2. 2. 2. 2. 2. 2. 2ers2. 2. 2. 2. 2. 2. 2. 2. 2. 2. 2ers2. 2.te2. 2. 2. 2. 2. .
**Organization repo** - get **Read / Triage / Wri**Organization repo** - get **Read / Triage / Wu w**Organization repo** - get **Read / | Role | Access |
|---|---|---|
| Akarsh | Admin | Personal repos + org admin |
| Ashwit| Ashwit| Ashwit| Ashwit| Ashwit| Ashte |
| Dhanavarsha | Dhanavarsha | Dhanavarsha | Dhanavarsha |ai| Dhanavarsha | Dhanavarsha | Dhanavarsha | Dhanavintain | Dhanavarsha | Dhanavarsha | Dhanavarsha | co| Dhanavarsha | Dhan r| Dhanavarsha | Dhanavarsha | Dhan: create from `main`, work locally, push to remote
- Bugfix branches: same flow as feature branches
- Hotfix branches: emergency fixes directly to `main` (Akarsh / Junai- Hotfix branches: e Junaid on- Hotfix branches: emergency fixes directly to `main` (Akarsh / Junai- Hotfix branches: e Junaid on- Hotfix branches: emergency fixes directly to `main` (Akarsh / Junai- Hotfix branches: e Junaid onir- Hotfix branches: emergency fixes directly tovie- Hotfix branches: emergency fixes directly to `main` (Akarsh / Junai- Hotfix branches: ely. Follow the branch naming conventions and
ensure tests pass before committing.
