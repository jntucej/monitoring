# V7 TASK GRAPH (DAG)

| Node | Type | Priority | Dependencies | Dependents | Status | Criticality |
|---|---|---|---|---|---|---|
| V7-01 | React Rules of Hooks (8 errors) | P0 | none | V7-06 | VERIFIED | CRITICAL |
| V7-02 | Missing `key` props in role-registers (10 errors) | P1 | none | V7-06 | VERIFIED | HIGH |
| V7-03 | React Compiler `preserve-manual-memoization` (5 errors) | P1 | none | V7-06 | VERIFIED | MEDIUM |
| V7-04 | Next.js `<Link>` vs `<a>` (4 errors) | P2 | none | V7-06 | VERIFIED | MEDIUM |
| V7-05 | TS `no-namespace` & `no-require-imports` (7 errors) | P2 | none | V7-06 | VERIFIED | LOW |
| V7-06 | Full Lint + CI + Test + Build Verification | P0 | V7-01..V7-05 | none | READY | CRITICAL |
| V7-07 | `visitor@college.edu` `DISABLED` in `gate_postgres` | P1 | none | none | NEEDS_DECISION | MEDIUM |
