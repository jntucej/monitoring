# Principal Experience — Route Inventory (live, 2026-11-22)

Source of truth: `src/app/(approver)/principal/**`. 25 routes (one is `/` =
`principal/page.tsx`, the new Command Center). All under the `(approver)` route
group; the console shell + AuthGuard is `principal/layout.tsx`.

| Route | Page | Purpose | Notes |
|---|---|---|---|
| `/principal` | page.tsx | **Command Center** (this programme) | decision-first landing |
| `/principal/home` | home/page.tsx | Executive overview + heavy retention widgets | MorningBrief, StrategicScorecard, ChainImpact, EmergencyPulse |
| `/principal/approvals` | approvals/page.tsx | Approvals inbox (tabs) | sub-URLs pending/escalated/overdue/delegated |
| `/principal/approvals/pending` | …/pending/page.tsx | | collapse target (PR-05/B2) |
| `/principal/approvals/escalated` | …/escalated/page.tsx | | |
| `/principal/approvals/overdue` | …/overdue/page.tsx | | |
| `/principal/approvals/delegated` | …/delegated/page.tsx | | |
| `/principal/attention` | attention/page.tsx | PR-12 attention queue | read-only projection of /api/principal/attention |
| `/principal/decisions` | decisions/page.tsx | PR-12 decision ledger | |
| `/principal/escalations` | escalations/page.tsx | PR-12 open escalations | |
| `/principal/emergency` | emergency/page.tsx | PR-12 command plane | **token-bypass unslop finding at line 9 (STATE_COLOR)** |
| `/principal/cases` | cases/page.tsx | Case register + 4-section inspector | THE inspection pattern to standardize |
| `/principal/examinations` | examinations/page.tsx | Exam ops | |
| `/principal/governance` | governance/page.tsx | Governance hub | |
| `/principal/governance/analytics` | …/analytics/page.tsx | | |
| `/principal/governance/audit` | …/audit/page.tsx | PR-12 thin audit view | |
| `/principal/governance/delegations` | …/delegations/page.tsx | Delegation mgmt | |
| `/principal/governance/reports` | …/reports/page.tsx | | |
| `/principal/operations` | operations/page.tsx | Ops hub (gates/hostel/incidents) | |
| `/principal/operations/gates` | …/gates/page.tsx | | |
| `/principal/operations/hostel` | …/hostel/page.tsx | | |
| `/principal/operations/incidents` | …/incidents/page.tsx | | |
| `/principal/passes` | passes/page.tsx | Gate passes | |
| `/principal/people` | people/page.tsx | People hub (departments/attendance) | |
| `/principal/people/departments` | …/departments/page.tsx | | |
| `/principal/people/attendance` | …/attendance/page.tsx | | |
| `/principal/profile` | profile/page.tsx | | |

**Verification:** every route above exists on disk (find `page.tsx`). No dead
routes found in the principal tree. The 4 approvals sub-URLs are the collapse
target for PR-05 (tabbed approvals + redirect map).
