# EXECUTION_RULES.md — V5

1. **One Problem -> One Execution Cycle:** Revalidate -> Trace Root Cause -> Design -> Implement -> Test -> Backtrack -> Regression Check -> Commit -> Checkpoint -> Next.
2. **Source of Truth Hierarchy:** Executable app behavior > Source code > DB schema > API > Auth/RBAC > Tests > V4.5 audit.
3. **Security & RBAC:** Never weaken auth/RBAC, never print/commit secrets, never invent fake roles/credentials.
4. **Batch-Before-Deploy:** Never run production `docker build` / `docker compose up` without explicit user authorization (`"yes deploy"`).
5. **Quality Gates:** Every commit must pass `npx unslop-ui . --strict --quiet` (`100/100`) and `npx tsc --noEmit` (`0` errors).
