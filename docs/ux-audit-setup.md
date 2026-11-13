# UX Psychology Audit — Setup & Workflow

## Installed Tools

| Tool | Location | Role |
|------|----------|------|
| ux-laws-reviewer v2.1.0 | `/root/.agents/skills/ux-laws-reviewer/` | Primary: scored UX audit + fix loop |
| unslop-ui v0.1.2 | `unslop.config.ts` + `unslop.baseline.json` | AI-slop scanner + baseline gate |
| pre-commit hook | `.git/hooks/pre-commit` | Blocks new UI slop findings |

## How to Run

### 1. Baseline UX Audit (no changes)
Ask the agent:
```
"Run a standard UX audit of the gate monitor dashboard (src/app/(admin)/admin/overview/page.tsx). Score all 5 dimensions. List findings by severity. Do NOT modify anything."
```

### 2. Deep Accessibility Review
```
"Do a deep accessibility review of the enrollment form (src/app/(approver)/...). Check WCAG 2.2 contrast, keyboard nav, focus management, ARIA, and error handling."
```

### 3. Quick Component Audit
```
"Quick audit of the gate status card component (src/components/gate/)."
```

### 4. Fix Loop (after audit)
```
"Fix the top 3 quick wins from the audit, then re-score and show before/after comparison."
```

### 5. CI / Pre-Commit Gate
- `unslop-ui --baseline --strict` — blocks new AI-slop findings
- `npx ux-laws-reviewer --force` — update the skill when new versions ship

## Pipeline Order

1. **unslop-ui** — "does it look AI-generated?" (deterministic scanner)
2. **ux-laws-reviewer** — "is it usable?" (psychology scoring)
3. **Re-scan both** — verify no regressions

A screen is not ready if either fails.

## Reference Files (in skill)

- `references/laws.md` — 25+ UX laws with detection patterns
- `references/scoring.md` — 0-100 rubric across 5 dimensions
- `references/accessibility.md` — WCAG 2.2 mapped to laws
- `references/components.md` — priority checklists per UI type
- `references/frameworks.md` — React/Next.js/Tailwind anti-patterns
