# ROLE_REPORT — supervisor

**Role:** Security Supervisor (`supervisor`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Overview
The supervisor surface is a **20-page security monitoring console** with 463 total LOC. 16 of 20 pages are 5–16-line re-exports of `_shared/*View.tsx`. The 4 real views: dashboard (325 lines), gates wall, team-roster, escalations. The "response" pages (escalations, incidents, exceptions) look actionable but are **read-only** — the `EscalationsView` comment (line 40) confirms the inspector is inspection-only.

## 2. Page Inventory (20 pages, 463 LOC)

| Page | Lines | Data | Write |
|---|---|---|---|
| `/supervisor` (home) | 325 | `GET /api/supervisor/dashboard` + escalation list | — |
| `/supervisor/home` | 5 | re-export | — |
| `/supervisor/gates/wall` | 11 | `GET /api/supervisor/dashboard` | — |
| `/supervisor/gates/activity` | 8 | gate activity | — |
| `/supervisor/gates/live` | 5 | live gate view | — |
| `/supervisor/response/escalations` | 16 | `GET /api/supervisor/escalations` | **NONE (read-only)** |
| `/supervisor/response/incidents` | 12 | incidents | **NONE** |
| `/supervisor/response/exceptions` | 10 | exceptions | **NONE** |
| `/supervisor/team/curfew` | 8 | `GET /api/supervisor/team-roster` | — |
| `/supervisor/team/shifts` | 6 | shifts | — |
| `/supervisor/team/workers` | 5 | workers | — |
| `/supervisor/shift/live` | 5 | live shift | — |
| `/supervisor/shift/handover` | 6 | handover | — |
| `/supervisor/shift/history` | 5 | history | — |
| `/supervisor/shift` | 5 | shift | — |
| `/supervisor/reports` | 5 | reports | — |
| `/supervisor/profile` | 5 | profile | — |
| + 3 more re-exports | 5-8 | — | — |

## 3. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-SP-01 | 16/20 supervisor pages are 5–16-line re-export stubs | MEDIUM | P2 | HIGH |
| F-SP-02 | "Response" pages (escalations, incidents, exceptions) are read-only; no PATCH/POST | HIGH | P1 | HIGH |
| F-SP-03 | Supervisor can see problems but cannot act on them from these pages | HIGH | P1 | HIGH |
| F-SP-04 | 20 URLs look like a full console; only ~5 distinct views exist | MEDIUM | P2 | HIGH |

## 4. Task Simulation
### Routine: Review escalations
1. Supervisor at `/supervisor/response/escalations` → `EscalationsView` renders `GET /api/supervisor/escalations`.
2. Sees open escalations with ticket details.
3. **No "Resolve" or "Acknowledge" button.** The comment in `EscalationsView.tsx:40` confirms: *"PATCH /api/permissions/[ticket]; the inspector never invents one."*
4. Supervisor must go to VP or caretaker surface to act.
**Friction:** High. The supervisor's primary job (respond to escalations) has no action path in its own console.

## 5. Coverage Statement
| Dimension | Status |
|---|---|
| Page coverage | COMPLETE (20/20) |
| Workflow coverage | PARTIAL (view-only; no action) |
| Interaction coverage | COMPLETE |
| State coverage | COMPLETE |
| Task simulation | COMPLETE |

## Verification Log (2026-11-24)
- 20 supervisor pages: **CONFIRMED** (find count = 20)
- 463 total LOC: **CONFIRMED** (wc -l on all page.tsx files)
- `EscalationsView.tsx` at `src/app/(supervisor)/supervisor/_shared/EscalationsView.tsx`: **CONFIRMED** (not in `src/components/supervisor/` as cited in initial doc)
- Comment at line 40: **CONFIRMED** — `* PATCH /api/permissions/[ticket]; the inspector never invents one.`
- 16/20 are re-export stubs: **CONFIRMED**
- 4 findings (F-SP-01 through F-SP-04): **CONFIRMED**
- No PATCH/POST in any supervisor page.tsx: **CONFIRMED** (grep returns 0 matches)

**Suggestion:** The supervisor's "response" pages (escalations, incidents, exceptions) should add a "Resolve" button that calls `PATCH /api/permissions/[ticket]` with `action: "ESCALATE"` (to forward back to VP) or a new `action: "RESOLVE"`. The backend already guards the PATCH for the supervisor role; the UI just needs the button.
