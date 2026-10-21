# Performance Guardrails

## The rule
Any module that imports **three**, **@react-three/\***, **recharts**, **remotion**,
**@remotion/\***, **qrcode.react**, or **react-qrcode-logo** must be loaded via
`next/dynamic({ ssr: false })` and rendered behind a user-triggered condition.
These libraries are large (several hundred KB to several MB) and are never needed
to render the first paint of a public or auth page.

`lucide-react` must use **named imports only** — never `import * as Icons`.
The star import pulls the entire icon registry (~4,000 icons) into whatever
chunk contains the file, inflating the shared shell chunk that every page
loads. The project uses `src/lib/lucide-icon-resolver.ts` for this reason.

CI enforces both rules with `scripts/verify-no-heavy-first-load.sh`.

## Why
- The "stuck loading screen" issue was caused by the shared shell chunk being
  ~1.5 MB of JS before first paint, most of it the full lucide registry and
  the three/react-three bundle that floated up through the static global
  provider chain.
- The fix cut first-load JS on `/` from ~1,480 KB to ~833 KB (−43%) without
  removing any feature — the heavy pieces are now route-split or lazy-loaded.

## CI gate
`.github/workflows/perf.yml` runs on every push to main and blocks the
release if a heavy marker reappears in the root-layout chunk set:

```
bash scripts/verify-no-heavy-first-load.sh "LucideAccessibility"
bash scripts/verify-no-heavy-first-load.sh "THREE.WebGLRenderer"
bash scripts/verify-no-heavy-first-load.sh "recharts"
```
