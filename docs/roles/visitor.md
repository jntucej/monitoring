# Visitor — how it works

## Overview
The `visitor` role represents external campus guests, vendors, contractors, and visiting guardians. Visitors use the web portal to register their identity, request host appointments, present digital passes, and track check-in/out timestamps.

The visitor interface is hosted under the public route group with 9 dedicated routes, providing a self-service visitor portal for pass requests, digital pass representation, self check-in/out, and viewing personal visitor pass statuses.

## Pages & workflows
The visitor interface spans 9 routes within the public route group:

### 1. Visitor Portal & Live Visit
- `/visitor`: Visitor Portal landing page presenting the live visit status overview, visit summary card, fast check-in/out CTA, and navigation links.
- `/visitor/visit`: Live visit detail view, active digital visit pass display, and interactive self-service check-in/check-out trigger.
- `/visitor/visit-details`: Detailed parameters of the scheduled visit, host contact details, permitted campus zones, and vehicle registration.

### 2. Request & Registration
- `/visitor/request`: Visit request form allowing guests to request an appointment with an institutional host (faculty, department, or administrative office).
- `/visitor/registration`: Visitor identity profile and registration view to update personal details, identity proof references, and contact phone numbers.
- `/visitor/approval-status`: Live status tracker for submitted visit requests awaiting host endorsement.

### 3. History & Check-In Operations
- `/visitor/history`: Chronological historical visit log displaying past campus visits, check-in/out timestamps, and host departments.
- `/visitor/checkin-out`: Dedicated check-in and check-out terminal view for QR pass presentation at gate kiosks.
- `/visitor/host-info`: Host profile information, department office location, and arrival instructions.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/visitors` | GET, POST, PUT | Creates a new visitor pass registration, lists passes, or updates guest details. |
| `/visitors/mine` | GET | Retrieves current active and past visitor passes belonging to the authenticated visitor. |
| `/visitors/[id]` | GET | Fetches details, validity status, host approval, and entry window for a specific visitor pass. |
| `/visitors/[id]/check-in` | POST | Records campus ingress for a visitor pass at an authorized gate terminal. |
| `/visitors/[id]/check-out` | POST | Records campus egress for a visitor pass. |
| `/visitors/me/check-in` | POST | Self-service check-in trigger from personal guest mobile device upon arriving on campus. |
| `/visitors/me/check-out` | POST | Self-service check-out trigger upon campus exit. |
| `/visitors/freeze` | POST | Emergency administrative/security freeze on visitor pass issuance or entry. |
| `/auth/session` | GET | Validates the current visitor JWT session and returns role context. |
| `/auth/login` | POST | Visitor phone OTP or guest credential login. |
| `/auth/refresh` | POST | Rotates the visitor session refresh token to extend or refresh the active session. |
| `/auth/logout` | POST | Terminates the active visitor session and clears auth cookies. |
| `/me/workspace` | GET | Minimal workspace profile endpoint for the authenticated guest user. |
| `/me/consent` | GET, POST | Records compliance consent for campus visitor policy and biometric capture. |

## Data flow
1. **Pass Registration & Approval**:
   - The visitor submits basic identity, vehicle, and host details via `POST /api/visitors`.
   - The host (faculty or administrative department) approves the pass.
   - A digital pass with a cryptographic QR code is issued to the visitor.
2. **Campus Ingress & Check-Out**:
   - At the main gate, the visitor presents their pass QR code.
   - The operator terminal scans it or the visitor invokes `POST /api/visitors/me/check-in`.
   - Campus security systems record entry timestamp in `movement_logs`.
   - If the visitor exceeds their permitted stay duration without a check-out scan (`POST /api/visitors/[id]/check-out`), the supervisor overstay monitor (`/api/supervisor/visitors/overstay`) automatically triggers an alert.

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie or Authorization header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Enforces `device_id` cookie verification matching the token's `dh` SHA-256 hash when logging in via web interfaces.
- **Strict Least Privilege**: The `visitor` role is strictly sandboxed. Visitors cannot access internal student records, faculty data, hostel areas, or administrative functions. Access is restricted to personal pass records (`/visitors/mine`).
- **Overstay Auto-Flagging**: Visitor passes have hard expiry windows. Failure to check out within the designated window marks the record as an overstay, dispatching alerts to security supervisors.


## Gaps & Research

### Institutional context
Per Indian university visitor management best practices:
- Visitor categories: parent, guardian, vendor, contractor, guest, government, alumnus
- Pre-registration with host verification and time-limited digital badges
- Real-time headcount across all gates
- Automated check-in/check-out with photo and ID capture
- Host notification on visitor arrival

Per NIT Hamirpur security SOP, all visitor matters are reported to the Security Control Room. The Security Supervisor is the escalation hub for visitor issues.

### Missing (not in app yet)
1. **Pre-registration portal** — no way for hosts to pre-register visitors in advance
2. **Visitor photo capture** — no photo capture at check-in
3. **Visitor categorization** — no structured visitor categories (parent, vendor, guest, government, alumnus)
4. **Visitor badge** — no digital badge with time-limited access
5. **Visitor history** — no history of previous visits
6. **Visitor feedback** — no way for visitors to provide feedback on the visit
7. **Visitor notification** — no notification to host when visitor arrives
8. **Multi-visitor support** — no support for groups of visitors (e.g. government delegation)

### Implementation notes
- Dashboard shows pass details, host info, check-in/out status
- Visitor agent is external to the institution
- Overstay: auto-flag with security alert
- Pre-registration: host-initiated flow with QR generation

### Agent persona
- Focus: pass lifecycle, check-in/out, overstay
- External: not an institutional user
- Can: view pass, check in/out, view host info
- Cannot: extend pass (needs host/Admin), access restricted areas
- Escalation: overstay → Security Supervisor → Admin



## Cross-Role Dependencies

### Visitor should see (read-only)
- **host**: host name, purpose of visit, time limit → Who invited me, how long
- **operator**: gate check-in/out status → Where I am in the pass lifecycle
- **supervisor**: overstay alerts → Know if I'm overstaying

### Visitor should NOT see
- **admin**: user governance, audit → not visitor's concern
- **sysadmin**: infra, MFA, RLS → not visitor's concern

### Visitor escalates to
- **supervisor**: overstay, access issues
- **admin**: visitor policy disputes

### Visitor borrows from
- **host**: pre-registration QR, visit details (host creates, visitor scans)
- **operator**: check-in/out status (operator records, visitor sees)

