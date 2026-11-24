# EXECUTION_RULES.md — V4.5-AFX

1. **One issue per cycle:** Never mix unrelated fixes in a single commit.
2. **Source of truth:** Actual source code > DB schema > API behavior > role config > V4.5 audit docs.
3. **Revalidate before fixing:** If already fixed in `main` (`44706eb3`), record evidence and mark `VERIFIED_FIXED` without reimplementing.
4. **Allowed statuses:** `PENDING`, `INVESTIGATING`, `PLAN_READY`, `IMPLEMENTING`, `TESTING`, `BACKTRACKING`, `VERIFIED_FIXED`, `PARTIALLY_FIXED`, `BLOCKED`, `REJECTED_WITH_EVIDENCE`, `REGRESSION_DETECTED`.
5. **Verification gates per fix:** `npx tsc --noEmit`, `npx unslop-ui . --strict --quiet`, plus targeted API/UI/backtrack verification.
6. **Commit format:** `fix(<area>): <specific change> (<ISSUE_ID>)`.
