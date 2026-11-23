# Dean — how it works

## Role in institutional life
The Dean is the academic supervisor at JNTUH CEJ, overseeing the Vice-Principal and all academic operations. The Dean role in the Gate Monitor system handles academic standing and status governance, institutional compliance and oversight, and cross-department academic review.

In real institutional life, the Dean:
- Supervises the Vice-Principal and all academic operations
- Oversees the Academic Council and Board of Studies
- Reviews academic standing of all students (SUSPENDED, DEBARRED, LATERAL_JOIN)
- Ensures institutional compliance with JNTUH, AICTE, and NBA standards
- Approves cross-department academic decisions
- Signs off on DEBARRED status alongside the HOD (two-person rule)

Per JNTUH ordinances, the Dean is the academic authority below the Principal and above the Vice-Principal.

## Operational standards
Per Indian university governance:
- Academic standing: Dean reviews all SUSPENDED/DEBARRED/LATERAL_JOIN flags
- DEBARRED: requires two-person approval (HOD + Dean/Principal) — Dean is the second approver
- Institutional compliance: Dean ensures JNTUH, AICTE, and NBA standards are met
- Cross-department review: Dean compares department performance and identifies gaps
- Board of Studies: Dean convenes and supervises Board of Studies meetings
- Academic calendar: Dean oversees the academic calendar, exam schedules, and holiday periods

## Accountability and escalation
- Dean reports to Principal (campus head)
- DEBARRED: Dean + HOD (two-person rule)
- Academic compliance: Dean → Principal → JNTUH VC
- Cross-department matters: Dean → Principal
- Board of Studies: Dean → Academic Council → Principal

## What we have in the app
- /dean — Dashboard with academic standing, compliance, cross-department view
- /dean/academic-standing — All SUSPENDED/DEBARRED/LATERAL_JOIN flags across departments
- /dean/compliance — Institutional compliance (JNTUH, AICTE, NBA)
- /dean/departments — Cross-department performance comparison
- /dean/board — Board of Studies decisions and minutes

Key API endpoints:
- GET /api/dean/academic-standing — All academic status flags
- POST /api/dean/academic-standing/[id]/approve — Approve DEBARRED (second person)
- GET /api/dean/compliance — Compliance dashboard
- GET /api/dean/departments — Cross-department view

Data flow: Dean actions are the highest-severity academic entries in audit_events. DEBARRED approval requires a matching HOD flag. Compliance data is aggregated from all departments.

## What is missing
1. Academic KPI dashboard — no single view showing academic performance across all departments
2. DEBARRED case file — no structured case file for disciplinary escalation
3. Board of Studies digital minutes — no digital record of academic council decisions
4. AICTE inspection readiness — no compliance checklist for AICTE inspections
5. NBA accreditation tracking — no tracking of NBA self-study report progress
6. Cross-department benchmarking — no structured comparison of department KPIs
7. Academic calendar management — no digital academic calendar with exam schedules
8. Student academic alerting — no proactive alert when a student's attendance drops below threshold

## Implementation notes for dashboard/agent
- Dashboard leads with academic standing, compliance, cross-department view
- Dean agent is the second approver for DEBARRED status
- Academic KPIs: attendance, marks, pass rate, compliance score
- Board of Studies: structured minutes with decisions and action items

## Agent persona
When acting as the dean role:
- Focus: academic governance, compliance, cross-department review
- Can: approve DEBARRED (second person), review compliance, compare departments
- Cannot: self-approve academic status; must follow two-person rule for DEBARRED
- Escalation: to Principal for final academic decisions; to JNTUH VC for compliance matters

