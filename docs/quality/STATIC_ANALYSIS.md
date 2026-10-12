# Gate Monitor — Static & Build Analysis

Date: 2026-10-12 · Workdir: `/root/monitoring`
Tooling: npm 11.19.0 (package manager), Node v24.21.0, typescript@5.9.3, eslint@9 (flat config `eslint.config.mjs`), Next.js 16.3.1.

## 1. TypeScript type check

Command: `npx tsc --noEmit -p tsconfig.json`

- **0 errors.**
- `tsconfig.json`: `strict: true`, excludes `node_modules`, `docs`, `tests`, `packages`, `scripts/prov`, `scripts/provision-role-accounts.mts` (matches the known exclusions).
- Re-run after fixes: still **0 errors** (verified).

## 2. Lint

Command: `npm run lint` (= `eslint src`)

- **0 errors, 1105 warnings** (was 1108 before this session's fixes; 3 removed).
- All rules in `eslint.config.mjs` are set to `warn`, so nothing is error-level; no linter errors.
- Warning profile (dominant categories): `no-explicit-any`, `no-unused-vars`, `prefer-const`, `@next/next/no-location-assign-relative-destination`, unused `eslint-disable` directives, react-hooks warnings.
- 23 warnings reported as auto-fixable (`--fix`).
- Re-ran eslint on the two fixed files: clean (no remaining warnings).

## 3. Production build

Command: `npm run build` (= `prebuild` → `node scripts/validate-env.js`, then `NODE_ENV=production next build`)

- **Success, exit 0.** Compiled successfully in ~3.3s; no type errors; all routes generated.

## 4. Dependency / lockfile consistency

- `package-lock.json` present (313 KB, npm lockfile v1 root = gate-monitor 0.1.0).
- `npm ls --depth=0`: exit 0, **no invalid / missing / UNMET** entries.

## 5. Risk-pattern scan (`src/`)

| Pattern | Count | Notes |
|---|---|---|
| `: any` | **468** | Worst offenders: `src/lib/db.ts` (52), `src/lib/postgres.ts` (43), `src/app/api/students/stats/route.ts` (11), `src/app/api/staff/stats/route.ts` (9), `src/app/api/staff/attendance/route.ts` (8) |
| `@ts-ignore` / `@ts-expect-error` | **0** | — |
| `as unknown as` | **17** | `src/lib/db.ts` (2), `src/app/api/mobile/login/route.ts` (2), `src/app/api/mobile/[...path]/route.ts` (2), plus sso/sound/rate-limit/mobile-auth/dbClient (1 each) |
| `.then()` without `.catch` in critical libs | **0** | Only one `.then` in `src/lib` (`postgres.ts:737` — query-builder passthrough returning `execute().then(...)`; caller controls rejection handling; not an unhandled fire-and-forget) |

## 6. Confirmed defects (prioritized)

1. **[HIGH] `src/server/services/operator/stats.ts:21-30` — operator stats service is a stub.** It fetches `users` via `findByIds` then discards it (commented-out map at line 22) and returns hardcoded empty `breakdown`/`outing`/`recentScans` with placeholder `{} as CategoryBreakdown` casts. Anyone consuming operator stats sees zeroed data. Fix requires the original aggregation logic (non-trivial; not fixed here).
2. **[MEDIUM] `src/stores/operatorStore.ts:115` — `activeStatsFetchCtrl` declared but never used** (dead code) plus `let` on an assignment-only site (`prefer-const`). Left as-is: removing a module-level variable shared across store functions is not "trivially safe" without a usage audit.
3. **[MEDIUM] `src/stores/operatorStore.ts:11` — `validateRollNumber` imported, never used.** Left in place (trivially removable but not part of a minimal single-purpose fix batch this session).
4. **[LOW] 468 `: any` annotations concentrated in `src/lib/db.ts` and `src/lib/postgres.ts`** — typed wrappers for pg/supabase data. Type-safe refactor candidate, not a defect fix.
5. **[LOW] 17 `as unknown as` casts** — most in `src/lib/db.ts` and mobile routes.

### Fixed this session (confirmed)

- `src/server/services/auth/lockout.ts:3-4` — removed unused imports `AppError` (line 3) and `MAX_FAILURES` (from line 4). **Verification:** `npx tsc --noEmit` → 0 errors; `npx eslint src/server/services/auth/lockout.ts` → no warnings.
- `src/stores/uiStore.ts:7` — removed unused `ToastVariant` type import. **Verification:** same commands, clean; full `eslint src` count dropped 1108 → 1105.

No `@ts-ignore`/`any` silencing introduced; `tsconfig.json` untouched.

## Left open

- stats stub (defect #1) — needs product-level logic.
- operatorStore dead code (#2, #3) — safe to remove but deferred.
- 1105 remaining lint warnings (all `warn`-level by config).
- 23 auto-fixable lint warnings available via `npx eslint src --fix` if desired.
