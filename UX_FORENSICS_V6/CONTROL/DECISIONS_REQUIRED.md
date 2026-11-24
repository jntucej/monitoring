# V6 DECISIONS REQUIRED

## D-01: Re-enable `visitor@college.edu` in `gate_postgres`?
- **Context:** `SMOKE_BASE=http://localhost:80 npx tsx scripts/verify-all-roles.ts` passed 378/387 `(role, leaf)` pairs, failing only on `visitor` (9 routes) because `visitor@college.edu` (`a7407b65-95f1-4804-92c1-835b0f046625`) has `status = 'DISABLED'` in `gate_postgres`.
- **Option A:** Keep `visitor@college.edu` `DISABLED` if intentional in production.
- **Option B:** Set `status = 'ACTIVE'` for `visitor@college.edu` and re-run `SMOKE_BASE=http://localhost:80 npx tsx scripts/verify-all-roles.ts --role=visitor`.
- **Required Approval:** Explicit user authorization for production DB user status update.
