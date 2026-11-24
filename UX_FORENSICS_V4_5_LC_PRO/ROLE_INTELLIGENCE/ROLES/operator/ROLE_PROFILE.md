# ROLE_PROFILE — operator
**Last updated:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Identity
- **Key:** `operator`
- **Display:** Gate Security Guard / Gate Operator
- **Source:** `src/lib/roles.ts:5`, `src/config/roles/operator.ts`, `docs/roles/operator.md`

## 2. Primary Objective
Manage gate operations: claim a gate, scan visitors/students (QR + biometric), record entry/exit, handle exceptions, toggle gate mode, and manual-entry when scan fails.

## 3. Organizational Responsibility
On-duty gate security. Reports to supervisor. Responsible for accurate scan records, exception handling, and gate availability.

## 4. Daily Responsibilities
- Claim gate at shift start (`POST /api/operator/claim-gate`)
- Scan every person entering/exiting (QR or biometric)
- Record manual entry when scan fails
- Reclassify scans when needed (`PATCH /api/operator/scans/[id]/category`)
- Toggle gate mode (open/closed)
- Review exceptions and pass-verification queue

## 5. Occasional Responsibilities
- Review recent-scan summary
- Check gate devices
- Handle kiosk PIN

## 6. Critical Responsibilities
- Accurate scan recording (occupancy depends on it)
- Lockdown response (gate mode toggle)
- Manual entry when biometric/QR fails

## 7. User Jobs to Be Done
| Job | Frequency |
|---|---|
| Scan a person at the gate | Every minute during peak |
| Verify a pass is valid | Per scan |
| Record manual entry | Occasional |
| Reclassify a mis-scanned entry | Rare |
| Claim gate at shift start | Daily |
| Toggle gate mode | As needed |
| Review exceptions | End of shift |

## 8. Operational Constraints
- Must have a gate assigned (`gateId` in JWT)
- Curfew rules apply (student 06:00–21:30; worker 06:00–22:00 Mon-Sat)
- Offline operation claimed in PRD but no offline-queue code observed

## 9. Expected Outcomes
- Every entry/exit recorded
- Exceptions resolved or escalated
- Gate available and mode correct

## 10. Dependencies on Other Roles
- **Supervisor:** escalates exceptions
- **Admin:** gate configuration
- **Student/Guardian:** the persons being scanned
- **Caretaker/VP:** pass approvals (operator verifies at gate)

## 11. Known Limitations
- No bulk scan
- No offline queue (code not verified)
- Pass-verification queue is read-only (GET only; PATCH for action is in `pass-verification` page)

## 12. Unknown Information
- Actual gate device hardware
- Offline resilience (PRD claim, code not verified)
- Shift scheduling (worker role handles shifts, not operator)

## Evidence References
- `src/app/(operator)/operator/*` (14 pages)
- `src/app/(operator)/gate/[gateId]` (500-line orchestrator)
- `src/components/operator/GateScanner.tsx`, `BiometricPrompt.tsx`, `ScanDetailModal.tsx`, `GatePickerScreen.tsx`, `PassPreview.tsx`
- `src/app/api/operator/*` (17 routes)
- `src/app/api/gate/*` (10 routes)
