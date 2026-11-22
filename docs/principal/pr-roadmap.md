# Principal Experience — 16-PR Roadmap

Depends-on order is the execution order. Each PR = one dedicated branch,
one reviewable change, tests + UI verification + rollback notes. MERGE and
DEPLOY are user-gated (never autonomous). Status reflects 2026-11-22.

## Phase 1 — Discovery & Foundation
| PR | Objective | Depends | Scope (files/modules) | Acceptance | Status |
|---|---|---|---|---|---|
| **01** | Full repo audit | — | the 6 docs/principal/* | all routes/components/APIs/permissions/gaps documented; no speculation | **DONE** (this doc set) |
| **02** | Shared interaction contracts | 01 | docs/principal/architecture.md, interaction-contracts.md, decisions/ + thin TS types (entity ref, inspection contract, workspace context, relationship, timeline event, action, execution state) | types are validated; no new framework; ≥2 real use-cases per abstraction; existing API contracts preserved | not started |
| **03** | Workspace state + navigation | 02 | principal/_shell + a small useWorkspaceContext hook (URL params for shareable ctx, local for transient); breadcrumb + return-to-origin | open/close inspector preserves page; back/forward predictable; deep-links refresh-safe; no second global store | not started |
| **04** | Unified Entity Inspector | 02 | consolidate EntityInspector + useEntityInspector + InspectOverlay + inspectionModels; composable sections; merge DetailSheet + InboxDetailSheet | existing inspection preserved; duplicates consolidated (audit diffs first); desktop side-panel + mobile sheet; kb/a11y; unknown type fails safe | not started |

## Phase 2 — Contextual interaction & investigation
| PR | Objective | Depends | Scope | Acceptance | Status |
|---|---|---|---|---|---|
| **05** | Contextual interaction upgrade | 04 | KPIs, charts, table rows, statuses, notifications, quick actions → real destinations (KPI→filtered records, row→inspector, status→explain/filtered) | every control has defined behaviour; no dead buttons; kb-accessible; no nested-click accidents | not started |
| **06** | Entity activity timeline | 04 | reusable timeline renderer (entity-activity vs live-stream are distinct) | real events only; deterministic order; actor+ts accurate; related-entity links; audit refs not invented; lazy for long histories | not started |
| **07** | Relationship exploration | 04 | related-entities section (incident→hostel/authority; complaint→student; approval→requester→approver; delegation→delegate→responsibility; exam case→event) | verified data; open via unified inspector; permission-aware; missing shown honestly; no N+1 | not started |
| **08** | Investigation workspace | 06,07 | overview→status→people/authorities→related→timeline→evidence→decisions→actions; progressive disclosure | supported types have a flow; not a page duplicate; permission-aware; return-to-origin; mobile | not started |

## Phase 3 — Decision & execution
| PR | Objective | Depends | Scope | Acceptance | Status |
|---|---|---|---|---|---|
| **09** | Unified decision workspace | 04 | reuse PermissionDetailPanel + inbox surfaces; request summary, requester, reason, stage, prev decisions, authority, constraints, actions, confirm+reason, result; batch reports per-record outcomes | one coherent model; server-authoritative; reasons collected; batch shows partial success; no approval regression | not started |
| **10** | Action execution framework | 09 | shared execution lifecycle IDLE→VALIDATING→CONFIRMATION→SUBMITTING→PROCESSING→COMPLETED/FAILED/PARTIAL/UNKNOWN→REVALIDATION; dup-click guard; idempotency only where backend supports | consistent execution; no false success; failed vs unknown distinguished; API contracts preserved | not started |
| **11** | Execution feedback + audit verification | 10 | post-action authoritative response, revalidation, resulting state, pending downstream, partial completion, recovery, audit link (confirmed only) | user understands what happened; records update; audit confirmed from real data; no false-positive success | not started |

## Phase 4 — Executive command centre & live intelligence
| PR | Objective | Depends | Scope | Acceptance | Status |
|---|---|---|---|---|---|
| **12** | Executive Command Centre | 05,08,11 | expand /principal (Stage B1) to 5 executive questions: attention queue, waiting-for-me, what changed, at-risk/overdue, what-to-inspect; sections A–H; reuse retention widgets that fit; every metric = definition+source+range+last-updated+drill-down; NO opaque AI priority score | clear hierarchy; every item inspectable; real data sources; useful empty/degraded; desktop+mobile; existing retained | **partially done** (B1 core landed c63dfec5; A–H + metric definitions remain) |
| **13** | Global command palette | 03 | upgrade PrincipalCommandBar from 5 nav commands → contextual (inspect entity, run action, jump workspace); preserve keyboard behaviour; via command-bars.manifest + useRoleConsoleChrome | existing nav preserved; contextual commands work; no regression on palette open/focus | not started |

## Remaining (PR-14/15/16)
The programme's 16-PR list continues past PR-13; the 3 most-recently-pulled
commits already covered separation-of-duties + E2E (institutional PR-14/15).
For THIS programme, PR-14..16 map to:
| PR | Objective | Depends |
|---|---|---|
| **14** | Live intelligence (SSE/polling) for attention + operational health without fake "live" indicators | 12 |
| **15** | Visual design pass (calm/precise/institutional; 2 accents; gap rhythm; no glass) across the principal console | 05–13 |
| **16** | E2E verification of the three complete chains (discover→inspect→act→verify→audit) + rollback runbook | all |

## Execution model
- One integration owner for shared infra (PR-02/03/04) — no two agents on
  the shell / inspector / execution framework at once.
- Independent PRs (e.g. 05 visual audit vs API-contract audit) may run in
  parallel AFTER their dependency stage lands.
- Every PR: branch → implement scope → tests → tsc + eslint → browser UI
  (desktop+mobile) → failure/permission scenarios → evidence → open PR → WAIT
  for review + merge auth. Build-passing ≠ complete.
- Backend additive changes (digest.series, dashboard delta/spark,
  audit summary) are contract changes → documented in PR-02 + reviewed, not
  silent.

## Approval gate
The user must approve this roadmap (or adjust it) before implementation
beyond the already-landed Stage B1. MERGE and DEPLOY remain user-gated.
