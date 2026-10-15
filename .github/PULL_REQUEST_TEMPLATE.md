---
name: Principal Dashboard Refactor
about: Use this template when rebuilding principal sub-pages
title: "feat(principal): <brief description>"
labels: "principal, dashboard"
assignees: ""
---

## Orchestration Prompt

When rebuilding principal pages, follow this prompt (copy-paste from docs/PRINCIPAL_REBUILD_PROMPT.md):

```
Rebuild (approver)/principal/** into N surfaces with one goal: shrink
time-to-first-decision and raise delegation rate.

Rules:
  1. One screen answers "What needs me now?" — everything else is one
     click behind a why.
  2. Every number = Now + vs last week + what to do.
  3. Every approval card offers inline Delegate.
  4. Collapse pages → surfaces. Redirect every old URL.
  5. Visual: light, high-contrast, 2 accents (emerald + rose),
     gap-8 rhythm, no glass effects, no icon on every KPI.
  6. Add 3 retention layers: Since-Last-Visit, Weekly Digest,
     Emergency Playbook drawer.
```

## Checklist

- [ ] All existing `_shared.tsx` exports preserved
- [ ] No new deps added
- [ ] No file > 400 lines
- [ ] Build passes: `npm run build`
- [ ] Old URLs redirect to new surfaces
- [ ] AuthGuard covers new pages
- [ ] No mixed GuardedPage + AuthGuard on same page

## Files Changed

| Path | Action |
|------|--------|
| `src/app/(approver)/principal/_shared.tsx` | Rewritten |
| `src/app/(approver)/principal/page.tsx` | Rewritten |
| `src/app/(approver)/principal/approvals/page.tsx` | New |
| `src/components/retention/PrincipalDigest.tsx` | New |
| `src/components/shared/EmergencyPlaybook.tsx` | New |
| `next.config.mjs` | Added redirects |
