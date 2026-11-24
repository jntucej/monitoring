# WORKFLOW_MAPS

**Generated:** 2026-11-24
**Phase:** V4.5 Dimension 20 — Workflow Forensics

## 1. Pass Lifecycle

```
Student creates (POST /api/permissions)
  → HOD approves (PATCH via PermissionDetailPanel)
  → VP co-signs (PATCH inline or detail panel)
  → OIE/Exam verifies (PATCH via OieCommandBar in RoleConsole)
  → Gate operator scans (QR or biometric)
  → Guardian notified (BROKEN: /api/pass-requests 404s)
```

**Handoff points:**
- HOD→VP: Clean (status PENDING→APPROVED at HOD stage → PENDING at VP stage)
- VP→OIE: Clean for exam passes
- OIE→Gate: **GAP** — OIE must navigate to RoleConsole to act; kanban is read-only
- Gate→Guardian: **BROKEN** — guardian fetch 404s

## 2. Gate Operation

```
Operator claims gate (POST /api/operator/claim-gate)
  → Toggle mode (POST /api/operator/mode)
  → Scan QR (Scanner → normalizeScannedPayload → PassPreviewFetcher)
  → OR biometric (BiometricPrompt → POST /api/gate/verify-thumbprint)
  → Record scan (entry/exit)
  → Occupancy updates
  → Alert on exception
```

**Handoff points:** Clean. Two-decision rule (IN/OUT) is well-designed.

## 3. Complaint Flow

```
Student files (POST /api/complaints)
  → Admin/Caretaker triages (PATCH /api/complaints/[id])
  → Resolution
  → Feedback (POST /api/complaints/[id]/feedback)
```

**Handoff points:** Clean. Complete loop.

## 4. Mess Token Flow

```
Mess-incharge issues (POST /api/mess/serve)
  → Student verifies at food service (GET /api/mess/token/[code])
  → Consumption tracked
```

**Handoff points:** Clean. No gaps.

## 5. Exam Access

```
OIE manages candidate attendance, hall tickets, access exceptions
  → OIE acts via OieCommandBar in RoleConsole (PATCH /api/permissions/[ticket])
  → Gate operator scans on exam day
```

**Handoff points:**
- OIE→Gate: **GAP** — discoverability (kanban read-only; must switch to RoleConsole)
- No direct OIE write on kanban surface

## 6. Lockdown

```
Admin broadcasts (POST /api/admin/lockdown)
  → All gates enter lockdown mode
  → Lift when resolved (DELETE /api/admin/lockdown)
```

**Handoff points:** Clean. Global broadcast.

## Cross-Workflow Issues

| Issue | Workflows Affected | Root Cause |
|---|---|---|
| Guardian notification broken | Pass Lifecycle | `/api/pass-requests` does not exist |
| OIE discoverability gap | Pass Lifecycle, Exam Access | `OieCommandBar` not inlined in kanban |
| Supervisor cannot resolve | Escalation (cross-workflow) | No PATCH button in `EscalationsView` |
| No bulk approval | Pass Lifecycle, Exam Access | `POST /api/permissions/bulk` unwired |
