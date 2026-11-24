# ROLE_PROFILE — student
**Last updated:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Identity
- **Key:** `student`
- **Display:** Student
- **Source:** `src/lib/roles.ts:8`, `src/config/roles/student.ts`, `docs/roles/student.md`

## 2. Primary Objective
Navigate campus access: create passes, view attendance, manage mess tokens, file complaints, check exams/marks/fees, and track library access.

## 3. Organizational Responsibility
Self-service student portal. No organizational reporting line within the app.

## 4. Daily Responsibilities
- Check active passes / create new passes
- View attendance status
- Check mess bill / opt out of meals
- File complaints if needed
- Review announcements

## 5. Occasional Responsibilities
- Dispute attendance records
- View marks / fees / library / scholarships
- Check exam schedule
- View special mess events

## 6. Critical Responsibilities
- Creating a valid pass before off-campus movement
- Responding to curfew

## 7. User Jobs to Be Done
| Job | Frequency |
|---|---|
| Create an outpass | When needed |
| Check active pass status | Daily |
| View attendance | Weekly |
| Opt out of meal | Weekly |
| File a complaint | Rare |
| Check marks/fees | Term |
| Check exam schedule | Exam period |

## 8. Operational Constraints
- Curfew: 06:00–21:30
- Pass must be approved before gate scan
- Mess opt-out has a deadline

## 9. Expected Outcomes
- Pass created and approved
- Attendance accurate
- Complaint resolved
- Mess token valid

## 10. Dependencies on Other Roles
- **HOD/VP/Caretaker:** approve passes
- **Operator:** verify pass at gate
- **Guardian:** notified of ward's movement
- **Mess Incharge:** issue tokens

## 11. Known Limitations
- Library/fees/scholarships pages are read-only shells (no write)
- Mess-bill opt-out failure triggers `alert()` (line 46)
- No pass revocation by student (admin-only)

## 12. Unknown Information
- Actual mess-bill amount calculation
- Library reservation system
- Fee payment integration

## Evidence References
- `src/app/(student)/student/*` (45 pages)
- `src/components/student/PassCreateFormV2.tsx`, `PassHub`, `PassHistory`, `ExtendPassModal`, `StudentAttendancePage`, `StudentExamsPage`, `StudentMarksPage`, `StudentFeesPage`, `StudentLibraryPage`, `StudentScholarshipsPage`
- `src/app/api/student/*` (19 routes)
