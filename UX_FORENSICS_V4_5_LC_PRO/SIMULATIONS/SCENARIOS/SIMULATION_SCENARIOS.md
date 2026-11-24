# SIMULATION_SCENARIOS

**Generated:** 2026-11-24
**Phase:** V4.5 Dimension 22 — Task Simulations

## Completed Simulations (7 roles)

### operator
- **Routine:** Scan a student at the gate (QR → PassPreview → IN/OUT → SuccessFlash). Friction: None.
- **Exceptional:** Reclassify a mis-scanned entry (transactions → scan → ScanDetailModal → PATCH). Friction: 2 hops.

### student
- **Routine:** Create an outpass (PassCreateFormV2 → POST /api/permissions → PENDING → APPROVED → QR at gate). Friction: None.
- **Exceptional:** Mess opt-out fails (POST /api/student/meal-opt-out → `alert()` on line 46). Friction: `alert()` blocking, unstyled.

### hod
- **Routine:** Approve a pass (ApprovalsView → DetailSheet → PermissionDetailPanel → PATCH → refresh). Friction: 1 detail-panel open per ticket. No batch.
- **Exceptional:** Escalate a ticket (detail panel → ESCALATE → next stage). Friction: None.

### vice_principal
- **Routine:** Co-sign a pass (pending-approvals → inline PATCH at line 110 OR detail panel). Friction: None for single ticket. Bulk is the gap.

### oie
- **Routine:** Check exam-day access (kanban → EntityInspector → **no action button** → must navigate to RoleConsole → OieCommandBar → APPROVE/REJECT). Friction: Discoverability gap.
- **Exceptional:** Cannot act from kanban; must switch surfaces.

### guardian
- **Routine:** Check ward's passes (child-status → ward list → profile → history → **Pass Timeline: EMPTY** (broken fetch)). Friction: CRITICAL. Silent 404.
- **Exceptional:** N/A (no write paths).

### supervisor
- **Routine:** Review escalations (response/escalations → EscalationsView → **no Resolve button**). Friction: HIGH. Supervisor must go to VP/caretaker surface to act.

## Deferred Simulations (14 roles)

| Role | Reason |
|---|---|
| admin | Read-heavy; simulation would be "manage user" (straightforward CRUD) |
| sysadmin | Infrastructure; simulation would be "approve automation decision" |
| mess_incharge | Straightforward: issue token → verify → consumption |
| principal | Straightforward: direct-generate pass |
| caretaker | Straightforward: type command in command bar |
| exam_branch | Read-only; no simulation value |
| exam_superintendent | Read-only; no simulation value |
| faculty | 2 write paths (class-messages, class-level-issues); would be "post class message" |
| staff | Read-only; no simulation value |
| visitor | Straightforward: check-in → check-out |
| worker | Read-only; no simulation value |
| deputy_warden | Read-only; no simulation value |
| hostel_manager | Read-only; no simulation value |
| emo | Read-only; no simulation value |
| entity-aligned | No UI; cannot simulate |

**Recommendation:** Run deferred simulations in a separate QA pass when the app is in a running state. The 7 completed simulations cover the highest-friction roles.
