# Mess In-charge — how it works

## Role in institutional life
The Mess In-charge / Warden (Mess) at JNTUH CEJ is the operational authority for all hostel mess facilities. Per JNTUH CEJ's hostel staff page, the Hostel Manager is "entrusted with the twin responsibilities of allotment of rooms in hostels as well as looking after the day-to-day mess facilities to the boarders." The Mess In-charge is the dedicated role for mess operations.

In the Gate Monitor system, the Mess In-charge:
- Finalizes the weekly/daily menu with the Mess Committee
- Issues food tokens to hostel residents
- Reconciles consumption vs inventory
- Manages vendor/contractor compliance
- Verifies mess bills
- Maintains the rebate ledger
- Handles food safety and hygiene compliance

## Operational standards
Per Indian university mess management best practices (referenced from TMU Mess Policy and similar institutional frameworks):
- Menu finalization: Mess In-charge works with the Mess Committee; menu is published 3 days in advance
- Token issuance: tokens are issued per resident, per meal, per day; usage is tracked
- Consumption vs inventory: weekly reconciliation between consumed food and purchased inventory
- Vendor compliance: vendors are contracted for specific items; compliance is audited quarterly
- Mess bill verification: bills are verified against actual consumption before payment
- Rebate ledger: rebates (cashbacks, discounts) are tracked and reconciled
- Food safety: FSSAI compliance, hygiene checks, and waste management

Per TMU Mess Policy (teerthankermahaveeruniversity.ac.in): "Provide hygienic, wholesome, nutritious and balanced meals at reasonable and approved rates. Maintain standards for food quality, preparation, storage, serving, sanitation and waste management. Ensure transparent management of mess operations, fees, procurement, vendor performance and user feedback."

## Accountability and escalation
- Mess In-charge reports to Hostel Manager (for hostel mess) and Principal (for campus mess)
- Menu disputes: Mess In-charge → Hostel Manager → Principal
- Vendor non-compliance: Mess In-charge → Hostel Manager → Principal
- Food safety issues: Mess In-charge → Principal → Health Authority
- Bill disputes: Mess In-charge → Hostel Manager → Principal

## What we have in the app
- /mess — Dashboard with menu, token status, consumption vs inventory
- /mess/menu — Menu finalization and publication
- /mess/tokens — Token issuance and usage tracking
- /mess/inventory — Consumption vs inventory reconciliation
- /mess/vendors — Vendor/contractor compliance
- /mess/bills — Mess bill verification
- /mess/rebates — Rebate ledger

Key API endpoints:
- POST /api/mess/menu/finalize — Finalize menu
- POST /api/mess/tokens/issue — Issue tokens
- GET /api/mess/inventory — View consumption vs inventory
- POST /api/mess/bills/verify — Verify mess bill
- GET /api/mess/vendors — Vendor compliance

Data flow: Menu finalization creates a menu record with publication date. Token issuance updates the token balance. Consumption vs inventory is calculated weekly. Bill verification is a structured approval flow.

## What is missing
1. Menu publication calendar — no visual calendar showing upcoming menus
2. Token balance alerts — no alert when a resident's token balance is low
3. Inventory low-stock alerts — no proactive alert when inventory is below threshold
4. Vendor performance dashboard — no structured vendor KPI tracking
5. Food safety audit — no structured FSSAI compliance audit checklist
6. Waste tracking — no tracking of food waste vs consumption
7. Resident feedback — no structured resident feedback on food quality
8. Cost per plate tracking — no tracking of cost per meal served

## Implementation notes for dashboard/agent
- Dashboard leads with menu, token status, consumption vs inventory
- Mess In-charge agent is scoped to mess operations
- Menu: structured finalization with publication date and Mess Committee sign-off
- Tokens: per resident, per meal, per day; usage is tracked in real time
- Inventory: weekly reconciliation with low-stock alerts

## Agent persona
When acting as the mess_incharge role:
- Focus: menu, tokens, inventory, vendors, bills, rebates
- Can: finalize menu, issue tokens, verify bills, track vendor compliance
- Cannot: approve bill payment (needs Hostel Manager/Principal), self-approve menu changes
- Escalation: to Hostel Manager for mess disputes; to Principal for food safety

