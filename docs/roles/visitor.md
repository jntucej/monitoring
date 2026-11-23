# Visitor — how it works

## Role in institutional life
The Visitor role represents a campus visitor (guest pass) at JNTUH CEJ. Visitors are external to the institution — parents, vendors, contractors, guests, government officials, or alumni visiting the campus. In the Gate Monitor system, the Visitor has a self-service pass lifecycle:

- Pre-registration (by host) or walk-in at gate
- QR code access at gate
- Check-in at gate
- On-campus movement (time-limited)
- Check-out at gate
- Overstay auto-flag if the pass expires while on campus

Per Indian university visitor management best practices, visitors are categorized:
- Parent/Guardian: visiting a student
- Vendor/Contractor: work on campus
- Guest: invited by a faculty/staff member
- Government: official visit
- Alumnus: visiting campus

Each category has different access scopes and time limits. The host (student, faculty, or staff) pre-registers the visitor, and the system generates a QR code for gate access.

## Operational standards
Per Indian university visitor management (referenced from campus security SOPs):
- Pre-registration: host fills a form, system generates QR, visitor scans at gate
- Walk-in: visitor arrives at gate, operator creates a pass, host verifies
- Check-in: visitor scans QR at gate, system records entry time
- Overstay: if the pass expires while on campus, the system auto-flags and alerts the security supervisor
- Photo capture: optional photo capture at check-in for security
- Host notification: host is notified when the visitor arrives on campus

Per NIT Hamirpur security SOP, all visitor matters are reported to the Security Control Room. The Security Supervisor is the escalation hub for visitor issues.

## Accountability and escalation
- Visitor reports to no one (external to the institution)
- Overstay: system auto-flags → Security Supervisor → Admin
- Security incident: visitor → Security Supervisor → Admin → Principal
- Visitor complaint: visitor → Security Supervisor → Admin

## What we have in the app
- /visitor — Self-service pass lifecycle view
- /visitor/check-in — Check-in at gate (QR scan)
- /visitor/check-out — Check-out at gate
- /visitor/pass — Pass details (host, purpose, time limit)
- /visitor/host — Host information displayed

Key API endpoints:
- POST /api/visitor/check-in — Check in at gate
- POST /api/visitor/check-out — Check out at gate
- GET /api/visitor/pass — View pass details
- GET /api/visitor/host — View host information

Data flow: Visitor check-in/check-out updates the visitor status table. Overstay is auto-flagged when the pass expires. Host is notified on check-in.

## What is missing
1. Pre-registration portal — no way for hosts to pre-register visitors in advance
2. Visitor photo capture — no photo capture at check-in
3. Visitor categorization — no structured visitor categories (parent, vendor, guest, government, alumnus)
4. Visitor badge — no digital badge with time-limited access
5. Visitor history — no history of previous visits
6. Visitor feedback — no way for visitors to provide feedback on the visit
7. Visitor notification — no notification to host when visitor arrives
8. Multi-visitor support — no support for groups of visitors (e.g. government delegation)

## Implementation notes for dashboard/agent
- Dashboard shows pass details, host info, check-in/out status
- Visitor agent is external to the institution
- Overstay: auto-flag with security alert
- Pre-registration: host-initiated flow with QR generation

## Agent persona
When acting as the visitor role:
- Focus: pass lifecycle, check-in/out, overstay
- External: not an institutional user
- Can: view pass, check in/out, view host info
- Cannot: extend pass (needs host/Admin), access restricted areas
- Escalation: overstay → Security Supervisor → Admin

