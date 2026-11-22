# Visitor — how it works

## Overview
The `visitor` role represents external campus guests, vendors, contractors, and visiting guardians. This is a minimal-surface, limited-lifecycle role in the Gate Monitor platform.

Visitors do not possess an internal administrative dashboard or complex operational workflows (hence 0 dedicated page routes in the application facts). Their interaction is strictly confined to self-service pass requests, digital pass representation, self check-in/out, and viewing personal visitor pass statuses via mobile/web view or kiosk endpoints.

## Pages & workflows
- **Limited UI Surface**: Visitors have no full dashboard suite (0 internal page routes). They interact with the system through public/guest onboarding links, pre-registration pass links, SMS-delivered QR pass views, or kiosk terminals.
- **Visitor Pass Lifecycle**:
  - Pre-registration / on-arrival request submission.
  - Presentation of generated digital pass (QR code / token) at campus gate kiosks.
  - Self-service or kiosk-assisted check-in and check-out tracking.

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
