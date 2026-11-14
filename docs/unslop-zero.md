# Unslop — zero-baseline policy

The invariant is **0 findings**, not "0 new findings." There is no
`unslop.baseline.json`; the file was deleted on 2026-11-14. Any
finding of any rule set to `error` blocks the commit via the
pre-commit hook (`npx unslop-ui . --strict`).

## What "zero" means per rule

| Rule | Severity | State |
|---|---|---|
| token-bypass | error | code zero (2026-11-14) |
| raw-hex-colors | error | code zero; 2 ImageResponse files excluded (prerender-only) |
| gradient-soup | error | code zero |
| card-lasagna | error | **scanner-zero** — see blind spot below |
| inconsistent-icon-size | error | code zero; `src/lib/icon-scale.ts` is the source of truth |
| muted-everything | error | code zero |
| random-radius | off | objectively inactive: one radius token, nothing to catch |
| random-shadow | off | objectively inactive: zero shadows in the graphite system |
| arbitrary-tailwind-values | off | scanner limitation: it cannot read `@theme` tokens |
| shadcn-default-look | off | scanner limitation + taste |
| generic-ai-hero | off | scanner limitation + taste |

## The card-lasagna blind spot (state it, don't paper over it)

`card-lasagna` is **scanner-zero, not structural-zero.** The
`.surface-card` CSS primitive carries border + radius + surface in a
single custom class, which the JSX-only scanner sees as zero signals.
The nesting that motivated the rule is still visually possible:

```tsx
<div className="surface-card p-6">
  <div className="surface-card p-4">   {/* passes --strict. Does not look right. */}
```

- The scanner cannot see CSS classes, so `unslop --strict` will **never**
  catch a nested-`.surface-card` regression.
- The pre-commit gate therefore does **not** cover this rule — the
  gate's value for card-lasagna is zero.
- The only enforcement is the DESIGN RULES header in every
  `scripts/scaffold-*.mjs` template: *"NEVER nest .surface-card inside
  .surface-card — one surface per section, always."*
- The next audit must include an **eyes-on pass** for surface nesting
  on any page that gains new `.surface-card` usage. A `grep -r
  'surface-card' src | ...` is a starting point, not a check — the
  structural answer requires reading the JSX tree.

This is permanent: it follows from the choice of a CSS primitive over
a JSX one. A `<SurfaceCard>` component with a prop-level guard would
make the rule machine-checkable; that is a larger refactor and is not
the state of the repo today.

## File-exclusion policy

The `ignore` list in `unslop.config.ts` has exactly two content files:
`src/app/icon.tsx` and `src/app/opengraph-image.tsx` (plus the
`**/opengraph-image.tsx` pattern). Both are ImageResponse prerender
contexts where CSS variables do not exist — raw hex is the only legal
option.

Adding a third content-file exclusion requires:
1. confirming the file is prerender-only (never rendered in the browser);
2. a one-line comment in the config explaining why;
3. a note in this file.

Anything that renders in the browser is fixed with a token, not
excluded.

## The "no escape hatch" property

The scanner binary (unslop-ui 0.1.2) does **not** read inline
`// unslop-ignore` comments — the capability does not exist in the
version in use. There is therefore no per-line suppression mechanism.
The three legitimate paths are: fix the code, exclude the file
(prerender-only, documented), or turn the rule off with a rationale
in the config. No fourth path. This makes the zero stronger than a
suppression-managed baseline — and means drift is visible as a failing
commit, not as a growing manifest.

## Verified on 2026-11-14

- `npx unslop-ui . --strict` → exit 0, "100/100 Clean; 0 findings in 1981 files"
- pre-commit hook: negative test (1 palette-color finding) → exit 1, blocks;
  clean tree → exit 0
- `npx tsc --noEmit` clean; `npx next build` OK
- Playwright `ui-all-roles` 19/19
- first-load JS 862 KB (budget 950 KB)
