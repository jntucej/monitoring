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

### B### B### B### B### B### B### B#ur### B### B### -pa### B### B### B### B### B### B### B#ur### B### B### -pa### B### B### B###-p### B### B### B### B### B### B### B#ur### B### B### -pa### B### B### B### B### B# b### B### B### B### B### B### B### B#ur### B### B### -pa### B### B#2. GitHub access levels (4 members)

**Personal repo** → get **Read / Wri**Personal repo*y.**Personal repo** → get **Read / Wri**Person /**Personal repo** → get **Read / Wri**Personal y**Personal repo** → get **Read / Wrn **Personal repo** → get **Read / Wri**Persomin | Personal repos + org admin |
| Ashwitha | Write | Personal repos + org write |
| Dhanavarsha | Triage Write | Organization repos |
| Jun| Jun| Jun| Jun| Jun| Jun| Jun| Jun| Jun| Jun| Jun| Junai| Jun| Jun| Jun| Jun| Jun| Jun| Jun| Jun| ect | Jun| Jun| Jun| JunPR| Jun| Jun| Jun| Jun| Jun| Jun|nches: create from `main`, work locally, push to remote
- Bugfix branches: sa- Bugfix branches: sa- Bugfix branches: sa- Bu emergency fixes directly to `main` (Akarsh / Jun- Bugfix branches: sa- Bugfix branches: sa- Bugfix branches: sa- Bu emergency fixes directly to `main` (Akarsh / Jun- Bugfix branches: sa- Bugfix branches: sa- Bugfix branches: sa- Bu emergency fixes directly to `main` (Akarsh / Jun- Bugfix branches: sa- Bugfix branches: sa- Bugfix branches: sa- Bu emergency fixin`. All team members with
write access can commit directly. Follow the branch naming conventions and
ensure tests pass before committing.
