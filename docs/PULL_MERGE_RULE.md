# Pull & Merge Rule — upstream `main` → local `main`

## Goal

Keep your local `main` in sync with the canonical repo `https://github.com/jntucej/monitoring.git` by **fetching then merging** (never rebasing — `pull.rebase = false` is set in `.git/config`).

## Remotes (already configured)

| Remote | URL | Purpose |
|--------|-----|---------|
| `upstream` | `https://github.com/jntucej/monitoring.git` | Canonical source — pull from here |
| `origin` | `https://github.com/Akarshjadi/samples_clg.git` | Your fork — push your own branches here |

## The rule (run from repo root)

```bash
# 1. Start from a clean tree on main
git checkout main
git status --short   # must be empty

# 2. Fetch latest from canonical repo (no merge yet)
git fetch upstream --prune

# 3. See what upstream has that you don't (review before merging)
git log --oneline main..upstream/main

# 4. Merge upstream into local main (fast-forward when possible)
git merge upstream/main

# 5. (optional) push your fork if you want origin in sync too
git push origin main
```

## Requirements

- Working tree clean before starting (`git status --short` empty).
- You are on `main` (`branch.main.remote = upstream`, `merge = refs/heads/main`).
- No `--rebase`. This repo merges, it does not rewrite history.
- If `main..upstream/main` is empty, you're already up to date — skip the merge.

## If there are conflicts

`git merge` will stop and mark conflicted files. Resolve them, then:

```bash
git add <resolved files>
git commit   # keeps a merge commit recording the upstream pull
```

Do not `git reset --hard` to discard conflicts — that loses local work.

## If you have local, unpushed commits on main

A fast-forward only works if your local `main` is a prefix of `upstream/main`. If you have local commits not in upstream, `git merge upstream/main` still works (creates a merge commit) as long as there are no conflicting changes. Review `git log --oneline upstream/main..main` first to know what's local-only.

## Never

- `git pull --rebase` (rewrites history; against repo config).
- `git push upstream main` directly — upstream is pull-only for contributors; land changes via PR to `jntucej/monitoring` per `CONTRIBUTING.md`.
- Force-push `main` after merging upstream.

## Related

- `docs/BRANCH_RULES.md` — GitHub branch-protection settings on `main`.
- `CONTRIBUTING.md` — PR workflow (branch off latest `main`, 1 approval, squash-merge).
- `.github/CODEOWNERS` — who must review `infra/`, `tests/`, `src/` changes.