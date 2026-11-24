# ACCESSIBILITY_RESPONSIVE_PERFORMANCE_PLAN

**Generated:** 2026-11-24
**Phase:** V4.5 Dimensions 11, 12, 13
**Status:** NOT PERFORMED — OUT OF SCOPE FOR READ-ONLY AUDIT

## Scope

This plan documents what would be tested for V4.5 dimensions 11 (Accessibility), 12 (Responsive UX), and 13 (Performance as UX). These dimensions require a running application and are not covered by the read-only code inspection performed in this audit.

## 11. Accessibility (WCAG 2.1 AA)

### Test Plan
| Test | Tool | Target Pages | Pass Criteria |
|---|---|---|---|
| Color contrast | axe-core | Top-20 pages | All text ≥ 4.5:1, UI boundaries ≥ 3:1 |
| Keyboard navigation | Manual | All interactive components | All actions reachable via Tab/Enter/Space |
| Screen reader | NVDA / VoiceOver | 5 core workflows | All content announced correctly |
| ARIA labels | axe-core | Forms, tables, buttons | All interactive elements have accessible names |
| Focus indicators | Manual | All pages | Visible focus ring on all interactive elements |

### Known Observations (from code inspection)
- `data-user-role` set on `<body>` for CSS selectors (AuthGuard.tsx)
- No `prefers-reduced-motion` handling in globals.css
- No custom focus styles in globals.css (Tailwind default)
- `lucide-react` icons used (semantic, not decorative)
- WCAG-conscious color tokens (border #C2C8D0 at 3:1; muted text #5A6472 at 5.4:1)

### Status: NOT PERFORMED

## 12. Responsive UX

### Test Plan
| Test | Tool | Target Viewports | Pass Criteria |
|---|---|---|---|
| Mobile layout | Lighthouse mobile emulation | 375px, 390px, 414px | No horizontal scroll; all content accessible |
| Tablet layout | Lighthouse | 768px | Grid reflow correct |
| Touch targets | Manual | All pages | Interactive elements ≥ 44x44px |
| PWA install | Chrome DevTools | All | Install prompt appears; offline capability |
| Gate desk | Manual | 1024px (kiosk) | Full-bleed layout correct |

### Known Observations (from code inspection)
- Gate desk is full-bleed (mobile-first for kiosk)
- Operator home has `WidgetBoundary` responsive grid
- No tablet-specific layout observed
- PWA: service worker + install prompt present

### Status: NOT PERFORMED

## 13. Performance as UX

### Test Plan
| Test | Tool | Target Pages | Pass Criteria |
|---|---|---|---|
| LCP | Lighthouse | /operator, /admin, /sysadmin | < 2.5s on 4G |
| TTI | Lighthouse | All | < 3.8s on 4G |
| INP | Lighthouse | All | < 200ms |
| Bundle size | Webpack analysis | All | No single chunk > 500KB |
| API response time | Manual | Top-10 endpoints | < 500ms p95 |
| WebSocket latency | Manual | /api/ws | < 100ms |

### Known Observations (from code inspection)
- `usePolling` hook on gate desk (30s interval)
- `primeAudio` for scan feedback
- No performance data measured in this audit
- `docs/load-test-results.json` exists but not re-verified

### Status: NOT PERFORMED

## Recommendation

Run these tests in a CI pipeline or as a separate QA pass with the application in a running state. The code inspection confirms the design system is WCAG-conscious, but actual compliance requires runtime testing.
