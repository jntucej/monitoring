
### Act 2 — The Caretaker's Tap
The Girls Hostel **Caretaker** (Seetha) logs in. Sidebar shows **Pending Approvals** with a badge. She opens **`/hostel/permissions`**. The list (auto-refreshed every 30s via `useLiveRefresh`) shows HST-1001.

She taps the row → `PermissionDetailPanel` opens. It shows Priya's name, roll, hostel block, reason, the two-day window, and a **stage timeline** with one entry: "Created by Priya". She taps **Approve**, optionally adds a comment, and confirms.

**Behind the scenes:**
- `PATCH /api/permissions/HST-1001` with `{ action: "approve", comment }`.
- `withAuthorization` injects `x-user-role = 'caretaker'`.
- The engine checks `canApproveAtStage('caretaker', 'hostel', 'caretaker') === true`. **Also checks `hostel_scope`:** Seetha's scope is `girls`, Priya's request scope is `girls` → ✓.
- Engine calls `applyPermissionAction(ticket, "approve", actor, comment)`.
- `current_stage` becomes `'deputy_warden'`. `stage_history` ga- `current_stage` becomes `'deputy_warden'`. `sN_A- `current_stage` becomes `'deon` - `current_stage` becomes `'deputy_warden'`. `stage_history` ga- `current_stage` becomes `'deputy_warden'`. `sN_A- `current_stage` becomes `'deon` - `current_stage` becomes `'deputy_warden'`. `stage_histoden ta- `current_stage` becomes `'deputy_warden'`. `stage_history` ga- `current_stage` becomes `'deputy_warden'`. `sN_A- `current_stage` becomes `'deon` - `current_stage` becomes `'deputy_warden'`. `stage_history` ga- `current_stage` becomes `'deputy_iya- `current_stage` bl ex- `current_stage` becomes `'deputy_warden'`. `stage_history` ga- `curreneck** section. The system verifies if devices are enabled. Since they are OFF by default, Caretaker taps "Mark Hostel Check Complete (device disabled)".
- `biometric_hostel_at = NOW()`. Priya's phone shows: **Hostel ✓ Verified**.

### Act 6 — The Gate
Priya walks to the Main Gate. Operator sees the ticket in their terminal, taps **"Mark Gate Check Complete"**.
- Engine checks `biometric_hostel_at IS NOT NULL` and `current_stage === 'main_gate'`.
- Status `COMPLETED`. Workflow ends.
