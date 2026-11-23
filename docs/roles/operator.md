# Operator — how it works

## Overview
The `operator` role represents the physical gate desk and turnstile attendant at campus entry and exit points. Operators are the frontline human controllers responsible for identity verification, pass validation, manual entry recording, exception handling, and device health monitoring across physical gates.

The operator UI is designed as an operational scanning kiosk surface rather than an analytical dashboard. It binds directly to an assigned physical gate (`gateId`) and runs high-throughput scanning loops for student and staff campus ingress and egress.

## Pages & workflows
- **/operator**: Landing page and desk picker. If the operator has an assigned gate, it directs straight into the scanning console; otherwise, prompts the operator to claim an active gate. Displays quick actions and desk retention summaries.
- **/gate and /gate/[gateId]**: The core scanning console. Provides a full-bleed camera scanning view, live status detection, directional ingress/egress decision buttons (IN / OUT), automatic recommendation heuristics (`recommend()`), pass previews, biometric prompts, and geofence warnings.
- **/operator/manual-entry**: Fallback workflow for manual entry when barcodes or RFID cards cannot be read. Allows entering a student roll number or staff ID, selecting direction (IN/OUT), recording reasons, and logging movement directly.
- **/operator/pass-verification**: Dedicated pass validation tool for single or batch verification of student gate passes, leave permissions, and out-passes.
- **/operator/claim**: Gate claiming workflow allowing unassigned operators to bind themselves to a physical gate using a gate claim code or supervisor assignment.
- **/operator/kiosk-pin**: PIN entry workflow for unattended or shared operator terminals, enabling fast kiosk session establishment via `/api/operator/kiosk-session`.
- **/operator/lookup**: Search and lookup interface to query student identity, active status, hostel affiliation, and pass status.
- **/operator/exceptions**: Exception review surface for flagged scans, curfew breaches, invalid leave chains, or unauthorized exit attempts.
- **/operator/transactions**: Movement logs and transaction audit history for the current shift and gate.
- **/operator/stats**: Real-time gate statistics, including entry/exit volume, hourly breakdown, exit reason distributions, and weekly trends.
- **/operator/mode**: Administrative gate mode switch (Normal, Curfew, Lockdown, Maintenance, Free Flow).
- **/operator/announcements**: Gate broadcast view for campus security alerts and operational announcements.
- **/operator/notifications**: Real-time operational alerts for gate events and supervisor dispatches.
- **/operator/password**: Password management and credential rotation.
- **/operator/profile**: Current operator profile, shift assignment, and workstation details.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/gate/scan` | POST | Submits a scan event for evaluation (evaluates student status, leave pass, curfew, and records movement). |
| `/gate/verify-pass` | GET, POST | Validates a digital pass token, verifying signature, validity window, and issuer. |
| `/gate/verify-leave-chain` | GET | Verifies whether a student has a complete, valid chain of approvals for leaving campus. |
| `/gate/devices` | GET | Returns online status, active operators, and recent scan timestamps for campus gates. |
| `/gate/stream` | GET | Server-Sent Events (SSE) stream for real-time gate scan and security notifications. |
| `/operator/kiosk-session` | GET, POST | Establishes an operator kiosk session using a kiosk PIN or trusted kiosk IP. |
| `/operator/claim-gate` | POST | Binds the authenticated operator to an active physical gate. |
| `/operator/manual-entry` | GET, POST | Records a manual ingress/egress entry when automated barcode/RFID scanning fails. |
| `/operator/lookup` | GET | Queries student details, hostel room, and active permission status. Takes `?id=<roll\|name\|employee-id>` (a single identifier, not `?roll=`). |
| `/operator/last-scan` | GET | Fetches the most recent scan record for display and rollback/edit actions. |
| `/operator/recent-scans/summary` | GET | Returns summary statistics and recent movements processed at the operator's gate. |
| `/operator/transactions` | GET | Paginated movement transactions log filtered by gate, date, and direction. |
| `/operator/mode` | GET, POST | Reads or updates the gate operational mode (e.g. curfew, lockdown). |
| `/operator/entry-type` | POST | Overrides or updates the entry classification (e.g. Day Scholar In, Home In). |
| `/operator/passes/batch-verify` | POST | Validates a batch of gate passes during peak transit hours. |

## Data flow
1. **Gate Ingress/Egress Scan**:
   - The scanner captures barcode/QR data from the student card or phone screen.
   - The UI normalizes the payload and calls `recommend()` to pre-calculate the expected direction and entry type.
   - The client posts the payload to `/api/gate/scan`.
   - The server validates student status, active leaves (`/api/gate/verify-leave-chain`), curfew constraints, and records the entry in `movement_logs`.
   - The result is streamed to supervisor monitors via `/api/gate/stream`.
2. **Kiosk Session & Gate Claiming**:
   - Terminal boots on kiosk hardware and requests `/api/operator/kiosk-session` with a PIN or trusted IP attestation.
   - The minted session installs an operator-scoped token into storage.
   - If `noGate` is flagged, the operator enters a claim code at `/operator/claim` triggering `POST /api/operator/claim-gate`, binding `users.gate_id`.

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie and Authorization Bearer header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Authenticated operator requests carry a `device_id` cookie whose SHA-256 hash must match the `dh` claim embedded in the JWT. Unattended kiosk sessions created via `/api/operator/kiosk-session` operate under explicit IP/PIN constraints.
- **Server-Side RBAC**: Protected endpoints enforce `withAuthorization` requiring `ROLES.OPERATOR`. Page navigation is guarded by `<AuthGuard allowedRoles={["operator"]}>`.
- **CSRF & Rate Limiting**: All mutation endpoints require CSRF token validation and enforce per-IP / per-user sliding window rate limits.


## Gaps & Research

### Institutional context
The Operator is the most time-critical role in the system. Per NIT Hamirpur security SOP: "The Security room at Gate 1 Exit side will be the Control Room for Security... All matters related to security, emergency etc. will be reported to the Control Room Only. The Control Room will be under the control of Security Supervisor."

Per Indian university campus security best practices:
- Operator must verify photo ID against the pass
- Operator must check watchlist before granting access
- Operator must log all manual entries
- Operator must report any device malfunction immediately

### Missing (not in app yet)
1. **Real-time scan queue** — no visual queue of pending scans at the gate
2. **Batch verification** — no structured batch verification for peak hours
3. **Watchlist check** — no automatic watchlist check on scan
4. **Photo verification** — no photo comparison at scan
5. **Peak hour alerting** — no alert when scan queue exceeds threshold
6. **Manual entry audit** — no structured audit of manual entries
7. **Device self-test** — no automatic device self-test at shift start
8. **Operator workload** — no tracking of operator scan count and accuracy

### Implementation notes
- Dashboard leads with gate view, scan queue, device health
- Operator agent is the most time-critical role — instant motion preset
- Scan: QR scan → verify → record → next; must be fast
- Manual entry: flagged for audit, requires photo ID verification
- Shift handover: structured with open items and pending passes

### Agent persona
- Focus: gate operations, scan, verify, record, device health
- Most time-critical role in the system
- Can: scan, lookup, manual entry, record transactions, report device health
- Cannot: approve passes (needs HOD/Hostel Manager), modify gate configuration
- Escalation: unresolved passes → Security Supervisor; device issues → SysAdmin

