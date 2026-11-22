# EMO — how it works

## Overview
The `emo` (Estate Maintenance Officer) role represents the institutional estate, campus engineering, and central physical infrastructure oversight authority. This role is a focused administrative role operating primarily within the campus complaints, physical infrastructure, and maintenance subsystem.

In the current Next.js application, `emo` acts as a specialized backend authority without a dedicated standalone UI page suite (0 dedicated page routes). EMO functions are consumed via the complaints console and maintenance APIs, giving the Estate Maintenance Officer full authority to review, triage, inspect, cosign, and audit campus-wide physical works, electrical grids, water lines, civil infrastructure complaints, and contractor SLA breaches.

## Pages & workflows
- **Limited UI Surface**: The `emo` role has no dedicated `/emo/*` page routes in the current web build. Estate maintenance personnel interact through the shared complaints console (`ComplaintConsole`), administrative complaint views, or direct API integration.
- **Estate & Infrastructure Oversight Workflow**:
  - Review campus-wide infrastructure complaints across all categories (civil, plumbing, electrical, HVAC, sanitation).
  - Triage critical complaints requiring campus engineering intervention.
  - Cosign major repair authorizations and budget allocations.
  - Audit vendor SLAs, response timelines, and contractor compliance reports.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/complaints` | GET, POST | Retrieves campus-wide maintenance complaints across all departments and blocks without residential scoping restrictions. |
| `/complaints/[id]` | DELETE, GET, PATCH | Inspects full complaint details, updates status (assigned, in-progress, resolved), or reassigns categories. |
| `/complaints/[id]/timeline` | GET | Audit history of state changes, engineering notes, and worker dispatches. |
| `/complaints/[id]/cosign` | POST | Applies engineering or budget cosignature to major infrastructure repair work orders. |
| `/complaints/[id]/call` | POST | Logs emergency contact or dispatch calls to external contractors or on-call technicians. |
| `/complaints/[id]/attachments` | GET, POST | Uploads engineering drawings, site inspection photos, or contractor completion certificates. |
| `/complaints/[id]/reopen` | POST | Reopens incomplete or sub-standard repair jobs following post-completion engineering audit. |
| `/complaints/categories` | GET | Fetches taxonomy of campus infrastructure and maintenance categories. |
| `/complaints/analytics/domain-breakdown` | GET | Analyzes volume and cost of maintenance across estate domains (electrical, civil, sanitation). |
| `/complaints/analytics/sla-breaches` | GET | Identifies overdue repairs and contractor SLA failures across campus infrastructure. |
| `/complaints/analytics/summary` | GET | High-level summary of campus maintenance health, MTTR (mean time to resolve), and open ticket aging. |
| `/complaints/config/routing` | GET | Queries ticket routing configurations and department assignment rules. |
| `/complaints/config/sla` | GET | Retrieves SLA resolution deadlines and escalation policies for estate issues. |
| `/complaints/export/advanced` | GET | Generates exportable CSV/Excel reports of all campus engineering and maintenance works. |
| `/complaints/audit/trail` | GET | Comprehensive regulatory and financial audit trail for estate maintenance actions. |

## Data flow
1. **Estate Maintenance Escalation & Cosign**:
   - High-cost or structural complaints logged by hostel managers, caretakers, or faculty route to the Estate Office.
   - The Estate Maintenance Officer reviews the ticket via `/api/complaints/[id]`.
   - If estimated repair costs or structural impacts exceed normal operational thresholds, the officer reviews engineering specs and executes `POST /api/complaints/[id]/cosign`.
2. **Contractor SLA Auditing & Review**:
   - The officer pulls `/api/complaints/analytics/sla-breaches` and `/api/complaints/monthly-review`.
   - Work completion certificates uploaded by contractors (`/complaints/[id]/attachments`) are inspected.
   - Substandard work is rejected via `POST /api/complaints/[id]/reopen` with inspection notes.

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie and Authorization Bearer header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Enforces `device_id` cookie verification matching the token's `dh` SHA-256 hash.
- **Authority Access**: Recognized in the `AUTHORITIES` set inside `/api/complaints/route.ts` alongside principal, admin, and hostel management. This grants campus-wide visibility across all complaints regardless of block boundaries, but restricts access from academic, grading, or gate security operations.
- **Immutable Audit Trail**: All engineering approvals, cosign actions, and status overrides are permanently recorded in `complaint_audit` with officer timestamps.
