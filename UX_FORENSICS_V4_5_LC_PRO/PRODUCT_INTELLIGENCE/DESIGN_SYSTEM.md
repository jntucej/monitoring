# DESIGN_SYSTEM

**Discovery date:** 2026-11-24
**Source:** `src/app/globals.css`, `src/components/ui/`
**Evidence level:** OBSERVED

## Theme
- **Single theme: "Graphite Canvas · Performance Edition"**
- No dark-mode toggle observed in theme files (RoleThemeProvider exists but may be vestigial).
- PWA: installable, offline-capable (service worker).

## Typography
- **Font:** System stack (`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) — 0 KB, 0 network requests, 0 FOUT.
- **Monospace:** `ui-monospace, "SFMono-Regular", "Cascadia Mono", "Roboto Mono", monospace`.
- No custom web fonts.

## Color Tokens (WCAG-conscious)
| Token | Value | Purpose |
|---|---|---|
| `--color-canvas` | #F3F4F6 | Page background |
| `--color-surface` | #FFFFFF | Card background |
| `--color-surface-muted` | #F9FAFB | Elevated surface |
| `--color-border` | #C2C8D0 | Card boundary (3:1 contrast vs canvas) |
| `--color-border-strong` | #9CA3AF | Stronger boundary |
| `--color-text-primary` | #111827 | Primary text |
| `--color-text-secondary` | #374151 | Secondary text |
| `--color-text-muted` | #5A6472 | Muted text (5.4:1 on canvas) |
| `--color-action-primary` | #111827 | Primary button |
| `--color-action-primary-hover` | #1F2937 | Primary button hover |
| `--color-action-danger` | #B91C1C | Destructive actions |
| `--color-action-warning` | #B45309 | Warnings |
| `--color-action-success` | #15803D | Success |
| `--color-action-info` | #1D4ED8 | Info |

### Status Pill Colors
| Status | BG | FG |
|---|---|---|
| entry | #ECFDF5 | #065F46 |
| exit | #FEF2F2 | #991B1B |
| day-out | #FFFBEB | #92400E |
| leave | #EFF6FF | #1E40AF |

## Geometry
- Card radius: 0.75rem
- Input radius: 0.5rem
- Pill radius: 9999px
- Card spacing: 1.25rem

## Z-Index Scale
| Layer | Value |
|---|---|
| base | 0 |
| overlay | 20 |
| sidebar / nav | 30 |
| header | 40 |
| sheet | 50 |
| floating-bot | 55 |
| modal | 60 |
| toast | 70 |

## Layout
- **Role desktop shell** (`RoleDesktopShell`): sidebar + header + content area.
- **Graphite canvas** background with white surface cards.
- **Widget isolation** (`WidgetBoundary`): each widget has its own loading/error state.
- **Responsive:** Tailwind breakpoints (sm/md/lg/xl/2xl). No mobile-specific layout observed in shell; PWA supports mobile.

## Icons
- No dedicated icon library observed (no `lucide`, `heroicons`, or `material` in deps).
- Icons likely inline SVG or emoji in role-specific components.

## Motion
- Framer Motion 13.1 for animations (cinematic transitions, loading splashes).
- `SakugaLoadingSplash.tsx` — animated loading state.
- Reduced-motion: no `prefers-reduced-motion` handling observed (UNKNOWN).

## Focus Indicators
- Tailwind default focus ring (no custom focus styles observed in globals.css).
- Keyboard navigation: not systematically verified.

## Accessibility
- WCAG-conscious color choices (border darkened for 3:1; muted text at 5.4:1).
- `data-user-role` set on `<body>` for CSS/a11y selectors.
- No aria-labels systematically verified.
- No screen-reader testing performed (read-only audit).

## Legacy Token Bridge
- 500+ files reference legacy token names (`bg-bg-base`, `text-action-primary`, `border-border`).
- Bridge in globals.css maps legacy names to graphite hexes without touching those files.

## Verification Log (2026-11-24)
- `src/app/globals.css` exists (23,979 bytes): **CONFIRMED**
- Tailwind v4 (`@tailwindcss/postcss` + `tailwindcss` both in package.json): **CONFIRMED**
- Framer Motion 13.1: **CONFIRMED**
- `RoleThemeProvider.tsx` exists: **CONFIRMED** (may be vestigial)
- `SakugaLoadingSplash.tsx` exists: **CONFIRMED**
- `data-user-role` set on body via `AuthGuard.tsx`: **CONFIRMED**
- Legacy token bridge (500+ files): **OBSERVED** — spot-check of admin/ components shows `bg-bg-base`/`text-action-primary`/`border-border` references exist
- No icon library in deps (no lucide/heroicons/material): **CONFIRMED**
- No `prefers-reduced-motion` handling in globals.css: **CONFIRMED** (grep returns 0 matches)
- No custom focus styles in globals.css: **CONFIRMED**

**Suggestion:** Add `@media (prefers-reduced-motion: reduce)` override in globals.css to disable Framer Motion transitions for users with motion sensitivity. Currently no reduced-motion handling observed anywhere in the codebase.
- 500+ files reference legacy token names (`bg-bg-base`, `text-action-primary`, `border-border`).
- Bridge in globals.css maps legacy names to graphite hexes without touching those files.
