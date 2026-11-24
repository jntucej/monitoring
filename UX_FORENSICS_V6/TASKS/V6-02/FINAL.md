# V6-02 — Live 387-Pair Role/Route Health Verification (`verify-all-roles.ts`)

- **Task ID:** V6-02
- **Severity:** HIGH
- **Priority:** P0
- **Status:** PARTIAL (378/387 clean; `visitor` blocked by `ACCOUNT_INACTIVE` in DB)

## Execution
Ran `SMOKE_BASE=http://localhost:80 npx tsx scripts/verify-all-roles.ts` against the live deployed `gate_web` container (`monitoring-web:latest`).

## Results
- **378 / 387** `(role, leaf)` pairs passed cleanly across 17 roles (`admin`, `caretaker`, `deputy_warden`, `emo`, `exam_branch`, `faculty`, `guardian`, `hod`, `hostel_manager`, `mess_incharge`, `oie`, `operator`, `principal`, `staff`, `student`, `supervisor`, `sysadmin`, `vice_principal`, `worker`).
- **9 / 387** failed for `visitor` (`visitor@college.edu`):
  `status=403 error={"code":"ACCOUNT_INACTIVE","message":"Account is DISABLED. Please contact an administrator."}`
- Verified in `gate_postgres`: `users` row `a7407b65-95f1-4804-92c1-835b0f046625` (`visitor@college.edu`, `role='visitor'`) has `status='DISABLED'`.

## Decision Boundary
Per V6 Authority Model, production database user status mutation is not performed without explicit authorization. Recorded in `UX_FORENSICS_V6/CONTROL/DECISIONS_REQUIRED.md`.
