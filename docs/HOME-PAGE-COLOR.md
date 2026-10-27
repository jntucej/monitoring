# Home Page — Colour System

## Principles

1. **Ambience is one hue.** The background bloom uses a single institutional
   teal (`--home-ambient`). It never carries meaning; it is atmosphere.
2. **Action is one hue.** Gold (`--home-action`) is reserved for the primary
   CTA, the eyebrow, and the scan-line. Nothing else uses it.
3. **Signals keep their meaning.** Emerald = IN / success, rose = OUT / danger.
   These appear **only** on the logo dots and status indicators — never as
   background fills. A visitor learns the colour language once and it holds
   across every console in the product.
4. **Every gradient stop is visible.** No headline stop may match the page
   background on either theme.
5. **Motion is slow and singular.** One orb, 60s loop, opacity ≤ 0.15. The
   `low` tier hides it entirely; `mid` tier slows it; `prefers-reduced-motion`
   removes it.

## Tokens (source of truth: `home.css`)

| Token | Dark | Light | Used by |
|---|---|---|---|
| `--home-ambient` | `14,116,144` | `8,145,178` | single background orb |
| `--home-action` | `251,191,36` | `180,83,9` | CTA, eyebrow, scan-line |
| `--home-signal-in` | `16,185,129` | `5,150,105` | logo dot, IN status |
| `--home-signal-out` | `244,63,94` | `225,29,72` | logo dot, OUT status |
| `--bg-flat` | `#0A1128` | `#f8fafc` | page base + theme crossfade |

**Do not** add a fourth accent. If a new state is needed, map it to one of the
four above (e.g. "warning" → `--home-action`).

## Headline gradient

5-stop horizontal gradient: `head-a → head-b → head-c → head-b → head-a`.
`head-c` must be a tint that contrasts the base on **both** themes
(`sky-300` dark / `teal-700` light). It must never equal `--bg-flat`.

## Contrast budget (WCAG AA)

| Pair | Ratio | Verdict |
|---|---|---|
| white on `#0A1128` | 19:1 | AAA |
| gold on `#0A1128` | 10.3:1 | AAA |
| emerald on `#0A1128` | 6.9:1 | AA (large) |
| rose on `#0A1128` | 4.3:1 | AA (large only) |
| text-secondary on `#0A1128` | 6.6:1 | AA |
| text-muted on `#0A1128` | 4.0:1 | AA large only — do not use for body |

Rose and `text-muted` are **large-text only**. Anything under 18px must use
`--home-text-primary` or `--home-text-secondary`.

## Performance constraints

- One animated blurred layer max. `filter: blur(60px)` on 120vmax is the budget.
- `will-change: transform`, `contain: layout paint style`, `backface-visibility:
  hidden` are mandatory on the orb.
- `data-home-tier="low"` hides the orb; `mid` halves the animation speed;
  `prefers-reduced-motion: reduce` disables it.
- `scripts/home-audit.sh` enforces: no `display:none` on animated elements,
  ≤3 `pointermove` listeners, `--home-grad-a` present in shipped CSS, and a
  `setTimeout` guard in any preloader.

## Known anti-patterns (do not reintroduce)

- Three overlapping semantic-coloured orbs (muddies to brown, fights the
  headline, reads as error/warning).
- `--home-head-c` set to the page background colour.
- Defining the same hue twice (`--accent-rgb` vs `--home-grad-a`).
- Theme crossfade base colours that differ from `--bg-flat`.
