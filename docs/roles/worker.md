# Worker — how it works

## Role in institutional life
The Worker role represents maintenance workers and grounds staff at JNTUH CEJ. Workers are field staff who perform physical maintenance, grounds upkeep, and facility support. The Worker role uses 'large taps, minimal text' UI because workers are field staff who use the app on mobile devices in outdoor or workshop environments.

In the Gate Monitor system, the Worker:
- Receives task assignments from Admin or Hostel Manager
- Views shift schedules
- Documents handover at shift end
- Marks task completion with photo evidence
- Reports equipment issues

## Operational standards
Per Indian university facility management best practices:
- Task assignment: Admin or Hostel Manager assigns tasks to workers; tasks have priority, SLA, and completion criteria
- Shift scheduling: workers are scheduled in shifts; handover documentation is required
- Task completion: workers mark tasks complete with photo evidence
- Equipment issues: workers report equipment malfunctions to Admin or Hostel Manager
- Grounds upkeep: workers are responsible for campus grounds, parking, and outdoor areas

Per Indian university maintenance management:
- Workers use mobile app with large taps and minimal text
- Tasks are tracked through the maintenance ticket workflow
- Handover documentation is required at shift end
- Equipment issues are escalated to Admin or Hostel Manager

## Accountability and escalation
- Worker reports to Admin (for operational tasks) and Hostel Manager (for hostel tasks)
- Task SLA breaches: worker → Admin
- Equipment issues: worker → Admin → SysAdmin (for gate hardware)
- Safety incidents: worker → Admin → Principal

## What we have in the app
- /worker — Dashboard with task queue, shift status
- /worker/tasks — Task assignment and completion
- /worker/shifts — Shift scheduling
- /worker/handover — Handover documentation
- /worker/equipment — Equipment issue reporting

Key API endpoints:
- GET /api/worker/tasks — Task queue
- POST /api/worker/tasks/[id]/complete — Mark task complete
- GET /api/worker/shifts — Shift schedule
- POST /api/worker/handover — Handover documentation
- POST /api/worker/equipment — Report equipment issue

Data flow: Worker task completion updates the maintenance ticket workflow. Handover documentation creates a handover record. Equipment issues are logged and escalated.

## What is missing
1. Task photo evidence — no photo capture at task completion
2. Task priority levels — no structured priority levels for tasks
3. Worker performance — no tracking of worker task completion rate
4. Equipment inventory — no view of equipment status and maintenance history
5. Safety checklist — no structured safety checklist for workers
6. Worker shift handover — no structured handover checklist
7. GPS check-in — no GPS check-in/out for field workers
8. Weather alerts — no weather alerts for outdoor workers

## Implementation notes for dashboard/agent
- Dashboard leads with task queue, shift status
- Worker agent uses large taps, minimal text (mobile-first)
- Tasks: structured with priority, SLA, completion criteria
- Handover: structured checklist with open items
- Equipment: reported issues are logged and escalated

## Agent persona
When acting as the worker role:
- Focus: task completion, shift handover, equipment reporting
- Mobile-first UI with large taps, minimal text
- Can: complete tasks, document handover, report equipment issues
- Cannot: assign tasks (admin territory), modify gate configuration
- Escalation: to Admin for operational; to Hostel Manager for hostel tasks

