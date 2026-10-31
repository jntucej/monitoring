# CHANGES — Gate Monitor P0–P2 + Phase 5.5 pass

Decisions log. Entries are the deliberate choices made while shipping this pass;
each one was the safer option at decision time and is recorded here instead of
being asked as a question.

## Phase 5.5 — Operator gate desk (Option A, scan-first pattern)

1. **Desk is a scanning surface, not a dashboard.** `gate/[gateId]/page.tsx`
   rewritten to one responsive surface: full-bleed camera (z-50), operational
   banners + top-anchored confirmation card (z-60), two fixed IN/OUT buttons +
   one Manual button (z-70). Chrome removed: mode bar, settings/menu/voice
   buttons, stats strip, recent-scans strip, mobile/desktop fork.
2. **One decoder pass, no scan modes.** `Scanner.tsx` gains an `all` mode:
   QR (native detector + jsQR fallback) and 1D/2D barcodes decode in the same
   frame pass. The QR/Barcode mode bar is gone because the operator's physical
   scan is one thing — which decoder runs is a code concern.
3. **No auto-confirm. No recommendation engine.** The confidence-based
   auto-fire (400/1200ms) and "1 recommended + 2 alternatives" card
   (`ScanConfirmation.tsx`) are deleted. Confirming always costs a deliberate
   IN or OUT tap; flagged students keep the flag banner and the same two
   buttons. `ScanConfirmation.tsx`, `ModePill.tsx`,
   `mobile/MobileOperatorScanView.tsx` deleted (zero live references).
4. **Entry type is institutional data.** IN/OUT confirm calls
   `confirmScan(addToast, dir)` only; the store resolves entry type from
   `student_details.current_entry_type` (hosteller fallback on IN) and
   defaults an OUT without a picked reason to `daily_outing`. The operator no
   longer answers "hosteller vs day-scholar" at the door.
5. **Success = 250ms green flash, instant reset** (was 1500ms). Failure =
   red card that stays until acknowledged. Green on the desk now means only:
   success flash, IN-direction status, and action buttons — never the camera.
6. **Decorative green camera overlays deleted, not recoloured** (5.5.1 spec):
   crosshair HUD block, glowing emerald square, animated scan-line, green
   spinner/bracket/glow in `Scanner`, `OperatorCamera`, (former)
   `MobileOperatorScanView`, and `ScanViewfinder` (file deleted — it was the
   QR/Barcode/Manual mode picker, now zero references). Camera frame is a
   1px neutral `border-white/15` at most.
7. **Landing rule: your gate, never "first active gate".** The
   first-active-gate default was removed from `gate/[gateId]`; unassigned
   operators land on `GatePickerScreen` (claim flow). `/operator` root shows a
   one-tap "Your gate" hero (open desk or claim) with the retention stack
   below the fold. No auto-redirect (a silent bounce is worse than one tap).
8. **Stats & log moved off the desk** to the existing `/operator/stats` and
   `/operator/transactions` routes; sidebar gains a Stats link.

### Evidence boundary (Phase 5.5)
- Verified: `tsc --noEmit` exit 0, `npm run build` exit 0, spec grep
  (5.5.2) returns zero emerald/scan-line/crosshair hits over any `<video>`
  surface (remaining emerald hits are direction/status badges and action
  buttons, which the spec permits).
- NOT verified: live camera decode (jsQR/native BarcodeDetector paths), the
  success-flash timing feel, and the "colleague scans in 5s" test require a
  real device. The decode loop itself is unchanged except the new `all`
  branch — regression risk is low but untested headless.

## Level B role dashboard composition (Phases 5.1–5.4)

- Composed roots: sysadmin, admin (via /admin/overview), student, parent,
  guardian, principal, vice-principal, hod, oie, emo, staff, caretaker,
  deputy-warden, hostel-manager, faculty (+faculty/subject), supervisor,
  operator, worker, mess, exam-superintendent, exam-branch, visitor.
  Redirect routes (/admin, /warden) are exempt.
- **KPI gaps are logged, not faked.** Where no real source table feeds a KPI
  (e.g. caretaker KPIs, exam-superintendent's single queue KPI,
  exam-branch queue/OIE-handoff counts), the role keeps its real-data
  surfaces (KPI tiles from live endpoints where they exist, KanbanBoards
  from `/api/permissions`, AllocationPanel) and the missing KPIs are noted
  here instead of hard-coding zeros.
- **Gate kiosk stays lean** (`gate/[gateId]`): the retention trio lives on
  the `/operator` root, not on the fixed full-viewport scan surface.
- Visitor got the lighter retention set (PersonalizedCampusHome +
  TaskContinuity, no calendar) per the composition spec; dev contact strip is
  absent for visitors only.

## Earlier phases (this pass)

- P0: duplicate migration version renamed (`rls_authenticated_policies` →
  20270101000007); deception-canary-token migration repaired against the live
  schema (`users.role`, `audit_logs.action` = CANARY_ALERT_TRIGGERED).
- P0: 22 scaffold stub endpoints replaced with real Postgres queries
  (admin access/alerts/data/governance overviews).
- P1: page-level tabs eliminated; sidebars carry all navigation; wide
  console grids normalised to `grid-cols-1 sm:…` responsive bases.
- Merged `feat/hod-retention-console` into main (6 shell-file conflicts
  resolved: ScrollEdgeBlue wrap kept on top of the responsive wrappers).

## Deliberately NOT done (logged, not suppressed)

- **verify-all-fixes: 8 queued checks** reference pre-reorg paths
  (`supervisor/exceptions` → `response/exceptions`, `principal/_shared.tsx`
  → `_shared/` dir, `supervisor/curfew` → team/curfew) and one genuinely
  unwired page (`supervisor/reports` has no `/api` fetch). Fixing them is the
  next batch of P0/P1/P2 work, separate from composition/5.5.
- **self-audit: 6 heuristic rules** (R5×3, R7×109, R8×26, R9×6, R11×1,
  R12×97) fire on pre-existing code. R7/R12 counts are inflated by a broken
  rg regex in the script itself ("error parsing flag -E: unknown encoding
  \\b(alert|confirm)(" — the R2 rule line), so their counts need review
  before any bulk "fix". Treated as the next audit batch, not silent-passed.
- **No history squash.** Per-phase commits were kept (each gated); the
  single-mission-commit consolidation was declined as the safer option —
  gate evidence stays in the commit log. Nothing pushed.
