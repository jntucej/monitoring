# Mess Incharge — how it works

## Overview
The `mess_incharge` role represents the operational manager of campus dining halls and mess facilities (Warden Mess / Mess Committee lead). The mess incharge is responsible for daily meal planning, meal session attendance tracking, QR token issuance and verification, inventory stock reconciliation, food consumption analytics, student mess feedback review, and vendor compliance.

The mess incharge balances operational dining logistics (verifying student meal tokens at dining counters, managing buffer meals) with administrative inventory controls (raw ingredient consumption, supplier invoices, mess rebate calculations).

## Pages & workflows
- **/mess**: Mess incharge overview console. Integrates `RoleDashboardPanel` pulling from `/api/mess/analytics`, presenting key performance indicators: daily diners count, meal attendance rates, inventory burn rate, and pending reviews.
- **/mess/scan**: Active counter scanning terminal. Operates high-throughput QR code and barcode scanning to check students in for Breakfast, Lunch, Snacks, or Dinner.
- **/mess/verify-token**: Dedicated meal token verification screen allowing manual token entry, single-token validation, and emergency manual meal approvals.
- **/mess/meal-attendance**: Real-time meal participation tracking by hostel block, course, and session, contrasting registered boarders with actual attendees.
- **/mess/menu-management**: Weekly and monthly meal schedule planning. Allows defining daily breakfast, lunch, snacks, and dinner dishes, dietary flags, and contractor menu instructions.
- **/mess/inventory-stock**: Raw grocery and ration inventory management. Tracks stock in hand, daily inward supply receipts, storage thresholds, and reorder warnings.
- **/mess/daily-meal-counts**: Consolidated meal census reporting buffer requirements and attendance variations across academic semesters and holidays.
- **/mess/consumption-reports**: Analytical auditing matching food ingredient consumption against diner counts to detect inventory leaks or contractor overbilling.
- **/mess/special-events**: Management of feast days, banquet events, and special meal tokens (e.g. college day, festivals), including token generation and guest token reconciliation.
- **/mess/reviews**: Student meal feedback monitoring. Tracks dish ratings, taste and hygiene feedback, student complaints, and official replies.
- **/mess/mess-issues**: Operational incident log covering equipment breakdowns, cold chain failures, contractor disputes, and kitchen hygiene issues.
- **/mess/operational-requests**: Administrative workflows for requisitioning additional kitchen equipment, emergency provisions, or staff overtime.
- **/mess/live**: Real-time live counter view showing current meal service status, active scans, and queue depth.
- **/mess/polls**: Mess satisfaction polls and feedback collection.
- **/mess/scan-v2**: Next-generation scanning terminal with improved token validation and offline fallback.
- **/mess/profile**: Mess incharge personal profile and notification settings.

## Key API endpoints
| Endpoint | Method(s) | What it does |
|---|---|---|
| `/mess/scan` (via `/mess/serve`) | POST | Validates a student meal token or student roll number and records meal service in real time. |
| `/mess/token/verify` | GET | Validates token code validity, session match (e.g. lunch vs dinner), and previous redemption status. |
| `/mess/analytics` | GET | Aggregates daily diners, attendance percentages, revenue/billing numbers, and rating trends. |
| `/mess/attendance` | GET | Fetches time-series meal attendance logs filtered by meal session, date, and hostel block. |
| `/mess/menu` | GET | Returns active weekly menu items grouped by day and meal session. |
| `/mess/menu-items` | GET, POST | Adds, modifies, or deactivates dish definitions and nutritional parameters. |
| `/mess/inventory` | GET | Retrieves current stock balances of raw provisions, unit costs, and reorder levels. |
| `/mess/consumption` | GET | Returns consumption logs detailing ingredient usage against diners served. |
| `/mess/meal-counts` | GET | Computes predicted vs actual meal counts for kitchen prep estimation. |
| `/mess/reconcile` | GET, POST | Reconciles raw material consumption with student scan counts to identify anomalies. |
| `/mess/reviews` | GET, POST | Retrieves student food reviews and posts administrative responses. |
| `/mess/reviews/aggregate` | GET | Generates rating aggregates, sentiment breakdown, and dish satisfaction indices. |
| `/mess/special-events` | GET, POST | Configures special banquet events, guest passes, and event-specific menus. |
| `/mess/events/[id]/tokens` | GET | Lists tokens minted for a special dining event with redemption status. |
| `/mess/token/[code]/revoke` | POST | Cancels a compromised or duplicate meal token. |

## Data flow
1. **Meal Service Counter Scanning**:
   - The student presents their digital meal token or scanned card at the mess entrance.
   - The counter operator runs `/mess/scan` (calling `POST /api/mess/serve`).
   - The server verifies that the token is valid for the current meal session (Breakfast, Lunch, Snacks, Dinner), confirms it has not been redeemed already, and marks it used.
   - Real-time attendance counters update immediately on `/mess/meal-attendance`.
2. **Menu Planning & Cost Reconciliation**:
   - The mess incharge updates the weekly cycle at `/mess/menu-management` (`POST /api/mess/menu-items`).
   - At end-of-day, the incharge records ingredient depletion via `/api/mess/consumption`.
   - The system triggers `/api/mess/reconcile` to compare ingredient burn rate against student scan tallies, flagging discrepancies.

## Security notes
- **Authentication**: JWT access token delivered via HttpOnly cookie and Authorization Bearer header, paired with rotating refresh tokens (`/api/auth/refresh`). Session state is revalidated against `/api/auth/session`.
- **Device Binding (M4)**: Enforces `device_id` cookie verification matching the token's `dh` SHA-256 hash.
- **Role Scoping**: Enforced via `withAuthorization` with `ROLES.MESS_INCHARGE` (and admin/sysadmin). Meal attendance modification, token revocation, and inventory reconciliation endpoints require valid mess incharge credentials.
- **Double-Redemption Prevention**: Meal token redemptions use database atomic transactions to prevent duplicate scans across parallel counters.


## Gaps & Research

### Institutional context
Per JNTUH CEJ's hostel staff page: the Hostel Manager is "entrusted with the twin responsibilities of allotment of rooms in hostels as well as looking after the day-to-day mess facilities to the boarders." The Mess In-charge is the dedicated role for mess operations.

Per TMU Mess Policy: "Provide hygienic, wholesome, nutritious and balanced meals at reasonable and approved rates. Maintain standards for food quality, preparation, storage, serving, sanitation and waste management. Ensure transparent management of mess operations, fees, procurement, vendor performance and user feedback."

### Missing (not in app yet)
1. **Menu publication calendar** — no visual calendar showing upcoming menus
2. **Token balance alerts** — no alert when a resident's token balance is low
3. **Inventory low-stock alerts** — no proactive alert when inventory is below threshold
4. **Vendor performance dashboard** — no structured vendor KPI tracking
5. **Food safety audit** — no structured FSSAI compliance audit checklist
6. **Waste tracking** — no tracking of food waste vs consumption
7. **Resident feedback** — no structured resident feedback on food quality
8. **Cost per plate tracking** — no tracking of cost per meal served

### Implementation notes
- Dashboard leads with menu, token status, consumption vs inventory
- Mess In-charge agent is scoped to mess operations
- Menu: structured finalization with publication date and Mess Committee sign-off
- Tokens: per resident, per meal, per day; usage tracked in real time
- Inventory: weekly reconciliation with low-stock alerts

### Agent persona
- Focus: menu, tokens, inventory, vendors, bills, rebates
- Can: finalize menu, issue tokens, verify bills, track vendor compliance
- Cannot: approve bill payment (needs Hostel Manager/Principal), self-approve menu changes
- Escalation: to Hostel Manager for mess disputes; to Principal for food safety



## Cross-Role Dependencies

### Mess In-charge should see (read-only)
- **hostel_manager**: hostel occupancy, mess menu oversight → Who's eating
- **student**: token balance, mess complaints → What residents need
- **admin**: mess bill status, vendor contracts → Financial status

### Mess In-charge should NOT see
- **sysadmin**: infra, MFA, RLS → not MI's concern

### Mess In-charge escalates to
- **hostel_manager**: menu disputes, mess rule violations
- **principal**: food safety incidents, vendor contract changes

### Mess In-charge borrows from
- **hostel_manager**: occupancy data (hm tracks, mi plans menu)
- **student**: token usage (student consumes, mi issues)

