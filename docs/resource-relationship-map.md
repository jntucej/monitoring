# Gate Monitor — Resource Relationship Map

## Core Entity Graph

- **Student** (`/admin/students/[id]`, `/hod/students`, `/student`)
  - → Profile, Assigned RFID Card, Gate Entry/Exit History, Attendance (`/student/attendance`, `/student/attendance-calendar`), Hostel Allocation, Guardian (`/guardian/child`), Permission Passes (`/student/passes/[ticket]`), Complaints (`/student/complaints/[id]`).
- **Approval / Permission Ticket** (`/permissions/[ticket]`, `/student/passes/[ticket]`, `/exam/permissions`)
  - → Requester, Current Stage (Faculty → HOD → Deputy Warden / Hostel → OIE → Vice Principal → Principal), Supporting Uploads (`/api/permissions/[ticket]/upload`), Decision History, Audit Trail.
- **Gate & RFID Reader** (`/admin/gates/[id]`, `/principal/operations/gates/[id]`, `/operator`, `/supervisor/gates`)
  - → Gate Schedule (`/admin/gates/schedule`), Device Config (`/admin/gate-device-configuration`), Live Presence Matrix, Exceptions (`/operator/exceptions`, `/supervisor/response/exceptions`).
- **Incident / Case** (`/admin/cases`, `/principal/operations/incidents`, `/supervisor/response/incidents`)
  - → Linked Student/Pass, Escalation Chain (`/admin/complaints/chains`), Resolution & Audit Log (`/admin/audit-logs`, `/principal/governance/audit`).
- **Backup & System Health** (`/sysadmin/backup`, `/sysadmin/backup-maintenance`, `/sysadmin/health`, `/sysadmin/scheduled-jobs`)
  - → `backup_policies`, `backup_executions`, `recovery_points`, Worker Scheduler (`backup-maintenance`), S3 Offsite (`worker/lib/s3-offsite.js`).
