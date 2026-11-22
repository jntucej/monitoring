# Principal Experience — Visual System (PR-15)

Codifies the shared visual rules for the Principal experience. These are the
rules that already govern the app (tokens in `src/app/globals.css`, the
`.surface-card` primitive, the house status tokens) — written down so a new
Principal surface applies them instead of re-inventing them. A surface that
breaks a rule below is a review defect.

## 1. Character

Serious institutional operating environment. No SaaS-analytics gradient, no
glassmorphism, no decorative glow, no oversized hero headings. The most
visually prominent element is the most important *information*, not the
largest number.

## 2. Layout (existing tokens — do not re-derive)

| Rule | Token / value |
|---|---|
| Card surface | `.surface-card` (`bg-bg-surface` + `border-border` + `--radius-card`) |
| Card padding | `--spacing-card` (1.25rem) |
| Input radius | `--radius-input` |
| Page rhythm | `space-y-8` between sections; `gap-4` in card grids |
| Grids | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for KPI rows; `lg:grid-cols-3` for retention panels |
| Density | compact + readable; no giant empty cards, no repeated page headers, no nested-card stacking |

**No nested card-lasagna.** A card inside a card inside a card is a design
defect the unslop gate flags (`ui-slop/card-lasagna`). A sub-panel is a
divider / left-accent / flat text — not another `surface-card`.

## 3. Typography hierarchy (existing scale)

| Element | Treatment |
|---|---|
| Page title | `font-semibold tracking-tight text-text-primary` |
| Section header | `SectionHeader` (uppercase `text-xs font-semibold tracking-wide text-text-muted` + hint) |
| KPI value | `text-2xl sm:text-3xl font-bold text-text-primary` |
| Body | `text-sm text-text-primary` |
| Metadata | `text-xs text-text-muted` |
| Numeric / id | `font-mono text-xs` |
| Status label | `text-xs font-semibold uppercase tracking-wide` + semantic accent |

## 4. Surfaces

Cards, drawers, sheets, and popovers all use `.surface-card` geometry + the
house border/spacing tokens. Empty states use `PrincipalEmptyState` (title +
description), never a bare `—`. A state (loading/error/empty/confirmation)
is a **divider or left-accent block**, not a nested card.

## 5. Status & severity (never colour alone)

| State | Token | Always paired with |
|---|---|---|
| Success / fresh | `text/border-action-success` | a glyph or label ("completed", "refreshed") |
| Warning / stale | `text/border-action-warning` | a label ("stale", "expiring") |
| Danger / overdue | `text/border-action-danger` | a label ("overdue", "failed") |

Severity is a *status token* (`--action-*`), not a raw hex. Colour signals
are always accompanied by text/glyph — no colour-only meaning.

## 6. Motion

Motion explains a transition (open/close, selection, loading), never
decorates. Use the house `transition` utilities sparingly on hover/focus
affordances. The global `@media (prefers-reduced-motion: reduce)` block in
`globals.css` disables all `transition`/`animation` durations — do **not**
opt a Principal surface out of it. A KPI tile's hover-lift (`-translate-y-0.5`)
is the only expected motion; it is auto-disabled under reduced motion.

## 7. Accessibility (every interactive control)

- Every interactive element has `focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none`.
- Dialogs/inspectors: `role="dialog"` + `aria-modal` + a labelled title; Escape closes; focus returns to the trigger.
- Result/feedback regions: `role="status"` (polite) or `role="alert"` (assertive).
- Listbox/palette: `role="listbox"` + `role="option"` + `aria-selected`.
- A drill affordance (a KPI that navigates) is a real `<button>` with an
  `aria-label` announcing its target ("Pending decisions: 4 — open queue"),
  not a `div` with `onClick` (invisible to keyboard/AT).
- Colour contrast: `text-text-primary` on `bg-bg-surface` is the baseline;
  muted text is `text-text-muted` (never a lighter custom grey).

## 8. Responsive intent (mobile is not compressed desktop)

- KPI grids collapse `lg:grid-cols-4 → sm:2 → 1`; sections stack.
- The inspector is a right drawer on desktop, a bottom sheet on mobile
  (`EntityInspector` already handles this).
- Tables scroll horizontally (`overflow-x-auto`); no text truncation that
  hides a value.
- Sticky: the top bar only; no nested sticky-on-sticky.

## 9. Verification (PR-16 gate)

Visual review at wide desktop / laptop / tablet / mobile. A screenshot of an
isolated component is **not** proof a workflow works — run the workflow (the
PR-16 E2E cases) and capture the sequence.
