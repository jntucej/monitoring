# Unslop-UI Audit Report

Generated: 2026-11-13
Scanner: unslop-ui v0.1.2
Project: gate-monitor (jntucej/monitoring)

## Summary

| Metric | Value |
|--------|-------|
| Total files scanned | 1987 |
| Baseline findings (suppressed) | 881 |
| New findings | 0 |
| Score | 0/100 (all pre-existing) |

## Baseline Breakdown

| Rule | Findings | Severity | Category |
|------|----------|----------|----------|
| ui-slop/arbitrary-tailwind-values | 320 | error | Design system |
| ui-slop/card-lasagna | 254 | warn | Layout |
| ui-slop/inconsistent-icon-size | 206 | warn | Components |
| ui-slop/raw-hex-colors | 32 | error | Design system |
| ui-slop/random-radius | 29 | warn | Design system |
| ui-slop/gradient-soup | 20 | error | AI slop |
| ui-slop/random-shadow | 15 | warn | Design system |
| ui-slop/token-bypass | 4 | error | Design system |
| ui-slop/muted-everything | 1 | warn | Typography |

**Total: 881 findings** (400 design-system, 254 layout, 206 components, 20 AI-slop, 1 typography)

## What Was Fixed (Mechanical Pass)

15,075 replacements across 716 files:
- Raw hex colors → CSS vars / Tailwind v4 theme tokens
- Arbitrary `[var(--x)]` values → bare utilities (via `@theme` registration in globals.css)
- Direct Tailwind palette colors → semantic tokens (emerald→action-success, amber→action-warning, rose→action-danger, sky→action-info, blue→action-primary, purple→unit-c, indigo→action-primary, violet→unit-c)
- Arbitrary px values → standard Tailwind spacing
- 44 remaining raw hex in ImageResponse contexts (CSS vars unavailable at prerender) documented with `// unslop-ignore`

## Remaining 881 (Structural / Design Judgment)

These require the unslop agent skill (nine-pass redline sequence) with a
direction statement. They are NOT mechanical fixes:

### card-lasagna (254) — Layout
Nested card-heavy layouts (6+ stacked border/radius/shadow/bg/padding wrappers).
Top offenders:
- src/app/(admin)/admin/attendance/bulk-import/page.tsx
- src/app/(admin)/admin/attendance/page.tsx
- src/app/(admin)/admin/gates/page.tsx

### inconsistent-icon-size (206) — Components
Files using 3+ different icon sizes in the same component.
Top offenders:
- src/app/(admin)/admin/alerts/page.tsx (sizes: 4,5,8,3)
- src/app/(admin)/admin/events/page.tsx (sizes: 6,9,4)

### arbitrary-tailwind-values (320) — Design system
Files still with 5+ arbitrary values (mostly CSS-var references that the
scanner flags even when using tokens). These are acceptable if the vars
are registered in @theme — the scanner doesn't recognize @theme tokens.

### raw-hex-colors (32) — Design system
Remaining hex in ImageResponse / opengraph contexts (CSS vars unavailable
at prerender). All documented with comments.

### gradient-soup (20) — AI slop
Gradient-heavy styling (common AI-generated SaaS pattern).
- src/app/(approver)/vice-principal/_retention/PrincipalBridge.tsx
- src/app/(approver)/vice-principal/department-performance/page.tsx

### random-radius (29) / random-shadow (15) / muted-everything (1)
Scattered, low-priority.

## CI / Pre-Commit Gate

- `.git/hooks/pre-commit` — runs `npx unslop-ui . --baseline --strict`
- CI SARIF: `npx unslop-ui . --baseline --strict --format sarif`
- Baseline update (only for deliberate design decisions):
  `npx unslop-ui . --update-baseline`

## Files

- `unslop.config.ts` — scanner config (rules, include/ignore, stack)
- `unslop.baseline.json` — 881-finding baseline snapshot
