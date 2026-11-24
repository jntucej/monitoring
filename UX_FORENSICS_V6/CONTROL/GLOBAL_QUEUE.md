# V6 GLOBAL QUEUE

| ID | Title | Category | Severity | Priority | Role | Target | Status | Next Action |
|---|---|---|---|---|---|---|---|---|
| V6-01 | Replace `alert()` with `useToast()` in `ComplaintForm.tsx` & `ComplaintDetail.tsx` | UX/UI | MEDIUM | P1 | student, caretaker, emo, hostel_manager | `src/components/complaints/` | VERIFIED | Closed (`addToast` replaces all 3 `alert()` calls) |
| V6-02 | Live 387-pair role/route health verification (`verify-all-roles.ts`) | Role/E2E | HIGH | P0 | all | `scripts/verify-all-roles.ts` | PARTIAL | 378/387 clean; `visitor` (9 routes) blocked by `status='DISABLED'` in DB (`DECISIONS_REQUIRED.md`) |
