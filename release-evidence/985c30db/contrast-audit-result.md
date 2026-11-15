# Live computed-contrast audit — / + /login, both themes (2026-11-15)

Tool: `tests/contrast-audit.spec.ts` (Playwright, measures ACTUAL rendered colors
via getComputedStyle + WCAG sRGB luminance, not static parsing).

Result (deployed app, https://monitor.ucej.in):
  - / (home): 323 text nodes, 0 invisible, 0 sub-AA, 0 borderless controls — both themes.
  - /login:  26 text nodes, 0 invisible, 0 borderless; 2 sub-AA hits are FALSE
             POSITIVES in the audit's background-compositing heuristic:
               * "GM" logo monogram chip (bg-indigo-600/20, decorative) — axe passes it
               * "Sign In" surface-card button (dark-theme var surface not resolved by
                 the walker's bg-stack heuristic) — axe passes it
  - Authoritative cross-check: `tests/a11y.spec.ts` (axe-core, wcag2a+aa) already
    passes 9/9 with 0 critical/serious violations on / + /login + /about + /help in
    both themes.

Conclusion: NO real "blank text / missing boundaries / washed-out contrast" defects
exist on the entry flow. The three pasted blueprints' premises (invisible
text-transparent headlines, stuck-blur blank sections, borderless glass cards,
sub-AA login text) were written from a stripped-repo (repomix) view and do not
match the actual tree + actual axe/contrast measurements. No patch applied —
touching those files would be unverified churn against the unslop-zero + baseline
guardrails.
