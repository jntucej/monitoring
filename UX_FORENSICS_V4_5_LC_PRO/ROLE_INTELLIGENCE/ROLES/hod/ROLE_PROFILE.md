# ROLE_PROFILE — hod (Head of Department)
**Last updated:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Identity
- **Key:** `hod`
- **Display:** Head of Department
- **Source:** `src/lib/roles.ts:9`, `src/config/roles/hod.ts`, `docs/roles/hod.md`

## 2. Primary Objective
Manage department faculty/students, approve pass requests, review faculty attendance, and monitor department performance.

## 3. Organizational Responsibility
Department head. Reports to Principal. Oversees faculty, students, and academic operations within the department.

## 4. Daily Responsibilities
- Review pending pass approvals (HOD stage)
- Monitor faculty attendance
- Review student roster
- Check department schedule

## 5. Occasional Responsibilities
- Review escalated requests
- Generate department reports
- Manage faculty assignments

## 6. Critical Responsibilities
- Approving/rejecting pass requests at HOD stage
- Faculty attendance oversight

## 7. User Jobs to Be Done
| Job | Frequency |
|---|---|
| Review pending approvals | Daily |
| Check faculty attendance | Daily |
| Review student roster | Weekly |
| Generate reports | Monthly |

## 8. Operational Constraints
- **APPROVAL QUEUE IS READ-ONLY:** `ApprovalsView.tsx:56` does GET only; no PATCH button. HOD can see pending tickets but cannot act from `/hod/approvals/pending`.
- Curfew and academic-calendar rules apply

## 9. Expected Outcomes
- Pending tickets reviewed
- Faculty attendance accurate
- Department performance visible

## 10. Dependencies on Other Roles
- **VP:** co-signs HOD-approved passes
- **Faculty:** reports to HOD
- **Students:** pass requests flow through HOD

## 11. Known Limitations
- **No action buttons on approval queue** (read-only in HOD; actionable in VP/caretaker)
- No bulk approval
- No direct-generate (principal-only)

## 12. Unknown Information
- Whether HOD has an alternative action path (e.g. via admin surface)
- Faculty assignment management depth

## Evidence References
- `src/app/(approver)/hod/*` (12 pages)
- `src/components/hod/ApprovalsView.tsx:56` (GET only)
- `src/app/api/hod/*` (7 routes)
- `src/app/api/permissions?stage=hod&status=PENDING`
