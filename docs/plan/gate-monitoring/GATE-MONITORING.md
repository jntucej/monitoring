# GATE MONITORING — Complete Feature & Role Reference

**Scope:** everything that happens at the gate, from a scan to a decision,
who does what, how it routes, and how the UI pieces interact.

**Verified against:** `src/app/(operator)/gate/[gateId]`, `src/stores/scanStore.ts`,
`src/app/api/gate/*`, `src/app/api/operator/*`, `src/app/api/supervisor/*`,
`src/components/operator/*`.

---

## 1. What the gate system does

The gate is the physical + logical boundary of the campus. It answers three
questions for every person who shows up with a credential:

1. **Who are you?** (identity: roll QR, security-token JWT, face, thumbprint)
2. **Are you allowed here, now, for this reason?** (pass/leave status +
   time window + entry-type + occupancy direction)
3. **What happens when you leave?** (which exit reasons are legal depends on
   how you entered — hosteller vs day scholar)

Every answer is recorded (`movement_logs`, `audit_events`) and the gate's live
state (occupancy, who's in) is what the rest of the campus sees.

---

## 2. Roles & how they route to the gate

| Role | Console | What they do at the gate | Route / API |
|---|---|---|---|
| **operator** | `(operator)/gate/[gateId]` kiosk | The actual scan + IN/OUT decision, manual entry, gate claim, device push | `/api/gate/scan`, `/api/operator/*` |
| **supervisor** | `(supervisor)` | Overrides a stuck PENDING link, escalates gate alerts, device issues, team roster | `/api/supervisor/*` |
| **principal** | `(principal)` | Lockdown (close all gates) | `/api/lockdown` |
| **visitor** | — | The person being let in; overstay auto-flags | via operator scan |

**Routing rule:** the gate escalation ladder is
`operator → supervisor → warden(→principal) → principal`
(`escalation-ladder.ts`). If a scan is flagged and the operator can't
resolve it, it escalates up that chain; each hop writes an audit reason.

**Scope lock:** an operator is *assigned* to one gate
(`/api/operator/claim-gate` + `gateId`). A stale/null assignment shows the
**gate picker** instead of a kiosk — scanning at a gate you don't own fails
the ownership check.

---

## 3. How a scan actually works (the full mechanic)

```
operator taps a scan  (QR / face / thumbprint auto-detected in one pass)
   │
   ▼  normalizeScannedPayload()  [lib/barcode]
   │
   ├─ if it's a security token (JWT / signed pass):
   │      POST /api/gate/verify-pass  → is this a valid, unexpired, un-revoked pass?
   │
   └─ in parallel (to save time):
          fetch the person        + fetch their approved passes
   │
   ▼
   resolve campus direction:
       currentCampusStatus = IN  → next tap is OUT
       currentCampusStatus = OUT → next tap is IN
   │
   ▼  ENTRY-TYPE selection (only when scanning IN)
       hosteller  → exit reasons: home visit / full-day / emergency / special-leave
       day_scholar → exit reason:  day (single fast path)
   │
   ▼  RECOMMENDATION ENGINE  [src/lib/operator-recommend.ts]
       combines: last OUT reason, current entry type, approved gate pass
       on file, curfew window, biometric readiness
       → one recommended action (direction + reason + entry type/button
         + confidence) plus up to TWO alternatives
       confidence < 0.7 → surface ALL alternatives (no auto-pick)
       This drives the "1 big button + 2 alternatives" UI — NOT a free
       multi-step reason/entry-type picker.
   │
   ▼
   operator taps the ONLY two buttons that exist:  IN  /  OUT
   │   (a flagged scan always costs a deliberate tap — no auto-confirm)
   ▼
   POST /api/gate/scan  → writes movement_log + audit_event
   │
   ▼
   if hostel leave:  POST /api/gate/verify-leave-chain
        returns exactly which link is missing:
        student pass → deputy_warden → parent ack → operator scan
   │
   ▼
   device-push:  POST /api/gate/device-push  → the gate hardware reflects it
```

**Key invariants (the "two-decision rule"):**
- The bottom bar carries **only IN / OUT** — the two decisions.
- Manual entry is *not* a third button; it's reached via "Can't see the code?"
  → "Enter Roll Manually" in the Scanner.
- No mode bar (QR + 1D/2D barcodes auto-detect in one pass).
- No auto-confirm: a flagged scan is always a deliberate operator tap.
- No stats, no recent-scans strip on the kiosk surface (a scanning surface,
  not a dashboard).

---

## 4. The UI — how the elements interact

### 4.1 The gate kiosk (`(operator)/gate/[gateId]`)

A **scanning surface**, not a dashboard. Layout:

```
┌─────────────────────────────────────────────┐
│  gate banner (id, status, occupancy state)   │
│  GeoFenceWarning (kiosk location vs gate)    │
│                                              │
│   ┌──────────────────────────────┐          │
│   │   SCANNER (QR/face/thumb)    │          │
│   │   "Can't see the code?"      │          │
│   │   → Enter Roll Manually       │          │
│   └──────────────────────────────┘          │
│                                              │
│   current student card (from scanStore)      │
│   campus status badge (IN / OUT)            │
│   last-out-reason (if OUT)                  │
│   entry-type picker (if scanning IN)        │
│                                              │
│  ┌───────┐  ┌───────┐                       │
│  │   IN  │  │   OUT │  ← the two decisions   │
│  └───────┘  └───────┘                       │
│                                              │
│   RecentScansSheet (tap to open history)     │
└─────────────────────────────────────────────┘
```

**State machine (Zustand: `useScanStore`):**
- `state` — idle / scanning / flagged / done
- `currentStudent`, `currentCampusStatus` (`IN`|`OUT`|null), `lastScan`
- `entryType` (`hosteller`|`day_scholar`|null), `lastOutReason`, `selectedDirection`
- `confirmScan(addToast, direction?, reason?, entryType?, entryButton?)` —
  the single mutation; fires `/api/gate/scan` and reconciles direction.

**Interaction flow a student sees at the desk:**
1. Operator starts a scan (or the hardware pushes one).
2. The student card fills in; if flagged, a deliberate tap is required.
3. Operator picks the entry type (if IN) and the exit reason (if OUT).
4. Taps IN or OUT → `confirmScan` → toast confirms, card resets, next scan.
5. `RecentScansSheet` (bottom sheet) shows the last N scans to undo/review.

### 4.2 Gate-aware shell (`GateAwareOperatorShell.tsx`)
Two modes:
- **`/gate/*`** → the desk owns the viewport. AuthGuard only, *no* shell
  chrome — the kiosk renders its own scanner/picker/banners.
- **other operator routes** → floating buttons + gate picker for unassigned
  operators.

### 4.3 The supporting operator pages
| Page | Purpose |
|---|---|
| `(operator)/operator/manual-entry` | Enter a roll number by hand (no QR) |
| `(operator)/operator/pass-verification` | Verify a pass without scanning |
| `(operator)/operator/mode` | Switch scan mode (legacy; kiosk auto-detects) |
| `(operator)/operator/password` | Step-up auth for sensitive moves |
| `(operator)/worker/*` | Work-orders, history, shifts (worker role) |

### 4.4 The supervisor console
`(supervisor)` dashboard: gate-live view, escalations queue, team roster,
shift state, visitors, claim-codes, assignees, retention. **Override path:**
when a leave-chain link is PENDING, the supervisor (not the operator) can
advance it — and must write an audit reason (that's the `tier_too_low`
escalation case in `nextActor`).

---

## 5. The API surface (gate)

### `src/app/api/gate/*`
| Route | Method | Does |
|---|---|---|
| `scan` | POST | the actual gate scan (writes movement_log + audit) |
| `verify-pass` | POST | validate a security-token / signed pass |
| `verify-leave-chain` | GET/POST | which hostel-leave link is missing |
| `verify-face` / `verify-thumbprint` | POST | device-anchored biometric verify (anti-spoof) |
| `device-push` | POST | push state to the gate hardware |
| `devices` | GET | device health inventory |
| `logs` / `stream` | GET / SSE | scan log + live occupancy stream |

### `src/app/api/operator/*`
`claim-gate`, `entry-type`, `gate`, `kiosk-session`, `last-scan`,
`lookup`, `manual-entry`, `mode`, `passes`, `recent-scans`,
`register-thumbprint`, `scans`, `stats`, `transactions`.

### `src/app/api/supervisor/*`
`assignees`, `claim-codes`, `dashboard`, `escalations`, `gate-live`,
`retention`, `shift`, `team-roster`, `visitors`.

---

## 6. The autonomous layer at the gate

| Agent | Cadence | Bounded to | Does |
|---|---|---|---|
| `gate-reconcile` | */5 | operator | reconcile scan state, flag orphans (scanned IN but never OUT) |
| `leave-chain` | */30 | hostel | leave-chain TTL reminders, 6h/12h escalation, auto-expiry, gate-token issuance |
| `alerts-eval` | periodic | operator | evaluate alert rules → push to consoles |

The gate agent **never closes a scan** — it only flags, reconciles, and
issues gate tokens. Human decisions (IN/OUT, overrides) stay with the
operator/supervisor.

---

## 7. Security invariants (do not break)

1. **Ownership:** a scan must pass the gate-ownership check
   (operator assigned to that gateId). Stale session → picker, not kiosk.
2. **No auto-confirm:** flagged scans require a deliberate tap.
3. **Biometric anti-spoof:** face/thumbprint verify are device-anchored
   (`register-thumbprint` enrolls against the hardware).
4. **Two-person override:** a stuck PENDING link needs a supervisor +
   audit reason — an operator can't override their own block.
5. **Tamper evidence:** every scan + override writes `audit_events`; the
   nightly hash-chain checkpoint catches post-hoc edits.
6. **Geo-fence:** `resolveKioskLocation` + haversine warn if the kiosk
   physical location doesn't match the gate it's claiming to be.

---

## 8. End-to-end example (hostel leave, full chain)

```
student (hostel) needs to go home
   student applies for a hostel pass          /api/passes
   deputy_warden approves the leave           /api/deputy-warden
   parent acknowledges                        /api/parent/leave/acknowledge
   student walks to gate, operator scans QR
      → verify-pass (valid)
      → entry-type: hosteller
      → verify-leave-chain: all links present → OK
   operator taps OUT (exit reason: home visit)
      → /api/gate/scan → movement_log + audit
      → device-push → hardware opens
   if any link was missing:
      → returns the missing link name
      → supervisor override (audit reason) OR student re-raises
```

---

## 9. What "everything we know" is — open items & gotchas

- **Offline gate JWT verifier** is *not* built (needs the edge hardware);
  today the gate needs connectivity. The verify-pass path is where it plugs in.
- **Multi-agent gate risk pipeline** (scan velocity, impossible travel) is
  the planned upgrade; signals are already in `movement_logs`.
- The `warden` role was **removed 2026-11** (consolidated into
  `principal`); the ladder still lists `warden` mid-chain and resolves it
  to `principal` at the top.
- **Geo-fence** is a warning, not a block, in v1.

---

## 10. Improving this — where to hook in (and what new architecture each pulls)

Open this when you want to change a gate feature. Each improvement lists the
**exact hook point**, the **files you touch**, and any **new architecture**
that comes with it. Follow the standing rules: migration replay on a fresh
Postgres, `tsc --noEmit`, and the 4-place permission chain (§2.2 in the
master doc).

### 10.1 Offline / edge gate
- **Hook point:** `POST /api/gate/verify-pass` is where the offline JWT
  verifier plugs in — today it assumes connectivity.
- **New architecture:** an **edge device** (Raspberry-PI-class) at each gate
  that holds a signed allowlist manifest (the same Ed25519 pattern as the
  exam-eligibility manifest agent). The manifest is signed by a host cron and
  pushed via `device-push`; the edge validates offline and logs to a local
  store that `gate-reconcile` drains on reconnect.
- **Files:** new `worker/jobs/gate-allowlist-manifest.ts` + a `gate/edge-verify`
  module; extend `verify-pass` to accept an `edge` flag.

### 10.2 Multi-agent gate risk pipeline
- **Hook point:** `movement_logs` already captures scan velocity and
  impossible travel; the pipeline is a new bounded agent.
- **New architecture:** a **risk-scoring agent** (`/api/cron/gate-risk`)
  that flags a scan for review without blocking it, writes `security_alerts`,
  and routes to the supervisor console (`/supervisor/response/incidents`).
- **Files:** new cron + a `risk-rules` seed table + a supervisor inbox row.

### 10.3 Change a reason / entry-type
- **Hook point:** `ExitReason` + `EntryButtonId` in `src/stores/scanStore.ts`
  and the `ENTRY_META` map in `src/lib/operator-recommend.ts`.
- **Files:** add the value to the type, the `ENTRY_META` entry, and the
  recommendation logic — then the kiosk renders it automatically. No new
  architecture.

### 10.4 New biometric modality (e.g. iris)
- **Hook point:** `verify-face` / `verify-thumbprint` are the template — a new
  `verify-iris` route + `register-iris` + a `device-push` payload.
- **New architecture:** a **device-anchored template store** (same anti-spoof
  model as thumbprint) + RLS on the template table.
- **Files:** new route pair + a `biometric_templates` migration (DO-block RLS).

### 10.5 Per-gate rules / schedules
- **Hook point:** `/api/gates/[id]` + `/api/gates/schedule`.
- **Files:** a `gate_rules` seed (by gate + time window) + a check in the
  scan path. The recommendation engine can read the active rule and factor it
  into confidence.

---

## 11. File map (so you can jump straight to the code)

| Concern | File(s) |
|---|---|
| Kiosk surface | `src/app/(operator)/gate/[gateId]/page.tsx` |
| Scan state machine | `src/stores/scanStore.ts` |
| Recommendation | `src/lib/operator-recommend.ts` |
| Scanner / sheets / geo | `src/components/operator/Scanner.tsx`, `RecentScansSheet.tsx`, `GeoFenceWarning.tsx` |
| Gate APIs | `src/app/api/gate/*` |
| Operator APIs | `src/app/api/operator/*` |
| Supervisor console | `src/app/(supervisor)/supervisor/*` |
| Autonomous agents | `src/app/api/cron/gate-reconcile`, `leave-chain`, `alerts-eval` |
| Escalation chain | `src/lib/escalation-ladder.ts` (`gate`, `gate_pass` domains) |
