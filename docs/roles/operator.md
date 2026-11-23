# Operator — how it works

## Role in institutional life
The Operator role represents gate desk operators at JNTUH CEJ — the people who physically operate the gate scanners, verify passes, and manage the flow of people and vehicles through campus gates. This is the most time-critical role in the system. The operator uses the 'instant' motion preset because scan time is critical: a slow UI means a backup at the gate.

In the Gate Monitor system, the Operator:
- Scans QR codes at the gate
- Looks up visitors/students by name or ID
- Handles manual entry when QR fails
- Records transactions (in/out events)
- Manages shift handover with open items
- Reports device health (scanner, sensor, network)
- Batch verifies passes at peak hours

## Operational standards
Per Indian university gate security SOPs (referenced from NIT Hamirpur security SOP):
- Gate operations: security room at gate exit side is the Control Room; all matters are reported there
- Operator duties: scan, verify, record, escalate
- Shift handover: operator → next shift operator with open items and pending passes
- Device health: scanner, sensor, and network status must be reported at shift start/end
- Peak hour: batch pass verification at morning (8-10 AM) and afternoon (4-6 PM) peaks
- Manual entry: when QR fails, operator manually enters name/ID and verifies against the pass list
- Escalation: unresolved passes → Security Supervisor → Admin

Per Indian university campus security best practices:
- Operator must verify photo ID against the pass
- Operator must check watchlist before granting access
- Operator must log all manual entries
- Operator must report any device malfunction immediately

## Accountability and escalation
- Operator reports to Security Supervisor
- Unresolved passes: operator → Security Supervisor → Admin
- Device malfunction: operator → Security Supervisor → SysAdmin
- Security incident: operator → Security Supervisor → Admin → Principal
- Peak hour backup: operator → Security Supervisor (additional operators deployed)

## What we have in the app
- /operator — Dashboard with gate view, scan queue, device health
- /operator/scan — QR scan and verification
- /operator/lookup — Name/ID lookup
- /operator/manual — Manual entry when QR fails
- /operator/transactions — Transaction log
- /operator/handover — Shift handover with open items
- /operator/device — Device health report

Key API endpoints:
- POST /api/operator/scan — Record QR scan
- POST /api/operator/lookup — Lookup by name/ID
- POST /api/operator/manual — Manual entry
- GET /api/operator/transactions — Transaction log
- POST /api/operator/handover — Shift handover
- GET /api/operator/device — Device health

Data flow: Operator actions are the highest-frequency entries in the gate event log. Manual entries are flagged for audit. Device health is reported at shift start/end.

## What is missing
1. Real-time scan queue — no visual queue of pending scans at the gate
2. Batch verification — no structured batch verification for peak hours
3. Watchlist check — no automatic watchlist check on scan
4. Photo verification — no photo comparison at scan
5. Peak hour alerting — no alert when scan queue exceeds threshold
6. Manual entry audit — no structured audit of manual entries
7. Device self-test — no automatic device self-test at shift start
8. Operator workload — no tracking of operator scan count and accuracy

## Implementation notes for dashboard/agent
- Dashboard leads with gate view, scan queue, device health
- Operator agent is the most time-critical role — instant motion preset
- Scan: QR scan → verify → record → next; must be fast
- Manual entry: flagged for audit, requires photo ID verification
- Shift handover: structured with open items and pending passes

## Agent persona
When acting as the operator role:
- Focus: gate operations, scan, verify, record, device health
- Most time-critical role in the system
- Can: scan, lookup, manual entry, record transactions, report device health
- Cannot: approve passes (needs HOD/Hostel Manager), modify gate configuration
- Escalation: unresolved passes → Security Supervisor; device issues → SysAdmin

