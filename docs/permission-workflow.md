# Permission Workflow

## Overview
Four workflows are supported: hostel, exam, memo, staff leave.

## Approval Chains

### Hostel
`caretaker → deputy_warden → hostel_manager → warden_or_principal → main_gate → completed`

### Exam
`faculty → hod → oie → vice_principal → principal → completed`

### Memo
`faculty → hod → oie → vice_principal → principal → completed`

### Staff Leave
`hod → vice_principal → principal → completed`

## Ticket Numbers
- Hostel: `HST-1001`, `HST-1002`, … (sequence `hostel_ticket_seq`)
- Exam:   `EXM-1001`, …
- Memo:   `MEM-1001`, …
- Staff:  `STF-1001`, …

## API Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST   | /api/permissions | Create a request |
| GET    | /api/permissions | List (role-scoped) |
| GET    | /api/permissions/[ticket] | Fetch single |
| PATCH  | /api/permissions/[ticket] | Approve / reject / forward / escalate / request info / complete |
| POST   | /api/permissions/[ticket]/upload | Upload PDF (exam/memo) |
| GET    | /api/permissions/[ticket]/document | Download PDF |
| POST   | /api/permissions/[ticket]/sign | Principal digital signature |
| POST   | /api/permissions/[ticket]/biometric | Hostel / gate biometric check |
| POST   | /api/permissions/bulk | Bulk approve/reject/forward |

## Dashboards
- `/dashboard/hostel` — Boys/Girls pending, funnel, overdue, biometric completion.
- `/dashboard/exam` — HOD/OIE/VP/Principal pipeline, upload/signature status.
- `/dashboard/campus` — Active permissions, workflow split, device status.

## Roles Added
`caretaker`, `deputy_warden`, `hostel_manager`, `principal`, `vice_principal`, `oie`, `exam_branch`.

## Device Settings
All device verification is **OFF by default**. Enable per device in `/sysadmin/devices` when hardware is ready. When disabled, biometric stages auto-pass with a soft note — the workflow does not block.

## Files Stored
Documents are saved locally at `data/uploads/permissions/{ticketNumber}/document.pdf`.
Signed copies saved as `document_signed.pdf`.
`data/uploads/` is git-ignored.

## Verification
Run:
```bash
npx tsx scripts/verify-permission-workflow.ts
```