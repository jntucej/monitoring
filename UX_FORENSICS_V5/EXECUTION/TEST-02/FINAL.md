# TEST-02 — `test:gate:node` 3 Suites Fail on `import.meta.url` in `auth-token.ts`

- **Issue ID:** TEST-02
- **Severity:** MEDIUM
- **Priority:** P2
- **Status:** VERIFIED

## Original Failure
`npm run test:gate:node` failed 3 suites (`auth/login-api.test.ts`, `auth/session-api.test.ts`, `e2e/operator-journey.test.ts`) with:
`SyntaxError: Cannot use 'import.meta' outside a module` at `src/lib/auth-token.ts:17`.

## Root Cause
`src/lib/auth-token.ts` used `createRequire(import.meta.url)` unconditionally in Node, which fails when Jest compiles TypeScript to CommonJS.

## Fix
Updated `src/lib/auth-token.ts` to prefer `typeof require === "function" ? require : ... createRequire(\`${process.cwd()}/package.json\`)`, preserving Edge runtime fallback while eliminating `import.meta.url`.

## Verification & Backtrack
- `npm run test:gate:node`: PASS (`26 passed, 26 total`, `153 passed, 153 total`)
- `npx tsc --noEmit`: PASS (0 errors)
