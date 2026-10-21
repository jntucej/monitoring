# Performance Guardrails

## The rule
Any module that imports **three**, **@react-three/\***, **recharts**, **remotion**,
**@remotion/\***, **qrcode.react**, or **react-qrcode-logo** must be loaded via
`next/dynamic({ ssr: false })` and rendered behind a user-triggered condition.
These libraries are large (several hundred KB to several MB) and are never needed
to render the first paint of a public or auth page.

`lucide-react` must use **named imports only** — never `import * as Icons`.
The star import pulls the entire icon registry into whatever chunk contains the
file. Use `src/lib/lucide-icon-resolver.ts` (49 named imports + a `getNavIcon`
fallback) instead.

## The guard
`scripts/verify-no-heavy-first-load.sh` is a **ground-truth first-load gate**.
It starts a production Next.js server, fetches the real HTML of `/`, and enforces:

- **PRIMARY — total first-load JS bytes.** This is the backstop that catches any
  regression that adds weight, not just lucide or three. Budget: fail > 950 KB,
  warn > 900 KB. Current baseline: ~831 KB.
- **SECONDARY — icon-path `d="M` string count across first-load chunks.** Fires
  when an icon-heavy registry lands in first-load. Fails > 300. (Note: in this
  build Turbopack tree-shakes the registry even under dynamic indexing, so this
  tier is currently inert at 0; it is kept as a future-proof diagnostic.)
- **TERTIARY — tree-shake-resistant library markers.** `WebGLRenderer` /
  `THREE.REVISION` for three, `ResponsiveContainer` for recharts. These export
  names appear as strings only when the library is actually bundled.

CI (`.github/workflows/perf.yml`) runs this gate on every push to main and blocks
the release if the budget is exceeded.

## Why
The "stuck loading screen" issue was a client-side bundle-bloat problem: the
shared shell chunk carried the full lucide registry and the three/react-three
bundle floated up through the static global provider chain. The fix cut
first-load JS on `/` from ~1,480 KB to ~831 KB (−44%) by lazy-loading the 3D
bot panel (`next/dynamic({ ssr: false })`) and switching the sidebar to named
lucide imports. No features were removed.

## Negative test (proof the gate fires)
Regress `src/components/shared/Sidebar.tsx` by re-adding
`import * as Icons from "lucide-react"` plus
`const iconMap: Record<string, any> = Icons` and dynamic `iconMap[item.icon ?? ""]`
lookups, rebuild, and run the gate:

```
❌ TOTAL first-load (1482 KB) exceeds 950 KB budget.
```

Revert and re-run:

```
✅ PASS: first-load within budget (831 KB, 0 icon paths, no three/recharts markers).
```

The **size budget** is what catches this regression in the current build.
