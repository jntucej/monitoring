# Docs Index — Gate Monitor

> **Updated: 2026-11-26** — This index catalogs every `.md` under `docs/`
> and separates **live reference** docs (kept in sync with the
> deployed code) from **historical** audit / fix / plan reports (point-in-time
> records left as-is). If a doc you're reading feels stale, check this index
> first: most "stale" docs are dated reports that were *superseded*, not
> *wrong*.
>
> **Read these first** (canonical): `CONTRACT.md`, `TECH_STACK.md`,
> `SERVER_ARCHITECTURE.md`, `RUNBOOK.md`, `AI_ARCHITECTURE.md`, `SEQ-IMPLEMENTATION-FRAMEWORK.md`.

---

## A. Canonical / Live Reference (kept in sync with code)

These describe the system *as it runs today*. Treat them as the source of
truth; update them when architecture changes.

| Doc | What it is |
| :--- | :--- |
| `CONTRACT.md` | System contract: auth, RBAC, permission engine, action envelope, teaching capability addendum. |
| `TECH_STACK.md` | Full stack + infra map; now includes the **AI model layer** section (M1/M2/M3). |
| `SERVER_ARCHITECTURE.md` | Container topology (web, worker, postgres, redis, caddy, cloudflared, ollama) + how they talk. |
| `RUNBOOK.md` | Operator runbook: restart, backup/restore, env, systemd services, cutover. |
| `BASE-SETUP.md` | First-time server setup (DB, env, .env sync). |
| `SECURITY.md` + `SECURITY_CHECKLIST.md` | Threat model + the security checklist the stack must satisfy. |
| `PERMISSIONS_ARCHITECTURE.md` | Permission engine / RBAC / credential isolation design. |
| `WORKFLOW-ARCHITECTURE.md` | Pass / leave / approval state machines. |
| `LOGICAL_ARCHITECTURE_COMPLETE.md` | Top-down logical view (short pointer doc). |
| `MIGRATION.md` | Migration conventions + history index. |
| `PERFORMANCE.md` | Performance budget + profiling notes. |
| `AI_ARCHITECTURE.md` | **3-model AI layer** — lifecycle, data flow, credential isolation. |
| `AI_MODEL_COMPATIBILITY.md` | Hardware/model selection report + measured benchmarks. |
| `AUTO_DEPLOY.md` | GitHub Actions → deploy pipeline. |
| `AUTONOMOUS_OPERATIONS.md` | The 13 autonomous cron jobs + kill-switch controls. |
| `teaching-capability-architecture.md` | Capability-keyed teaching/academic access (binding, not role). |
| `student-personas-passes.md` | Student personas and pass-type matrix. |
| `SEQ-IMPLEMENTATION-FRAMEWORK.md` | Security/observability/backup hardening units U1–U10 + U8.1 + UI/API audit ledger (all deployed). |
| `ui-architecture.md` | UI navigation, shell model, KPI drill-downs, and security/a11y patterns (467 pages, 675 components). |
| `ui-interaction-inventory.md` | Interactive element & KPI drill-down inventory across role dashboards. |
| `resource-relationship-map.md` | Cross-entity resource & drill-down relationship map. |
| `ui-page-coverage-matrix.md` | 100% page-by-page live Playwright browser verification matrix (466/466 VERIFIED). |
| `u10-s3-offsite-setup.md` | S3 offsite backup configuration & `HeadObjectCommand` verification guide (disabled by default). |
| `pre-deployment-readiness-audit.md` | Pre/post-deployment readiness & rollback record (`:pre-u7-u10-deploy` + `pre-u7-u10-deploy.dump`). |

### Roles (live)
`docs/roles/` — one file per role (`_overview.md` is the map). **Note:** the
standalone `warden` role was removed 2026-11 and consolidated into `principal`;
`chief_warden` and `deputy_warden` are **role contexts**, not separate users
(see `roles/principal.md` §"Dual Roles").

### KB (live)
`docs/kb/` — `general/campus-rules.md`, `student/pass-requests.md`,
`sysadmin/sysadmin-guide.md`, `warden/warden-sop.md` (the SOP wording uses
"warden" as shorthand for the hostel-approval flow; the live mechanism is the
principal's `assigned_hostel` hostel-block assignment, not a warden role).

### Runbooks (live)
`docs/runbooks/` — per-incident operator playbooks:
`deploy-rollback`, `worker-down`, `gate-offline`, `telegram-down`,
`login-failures`, `scan-duplicates`, `audit-tamper`, `disk-free-low`, etc.

---

## B. Historical / Point-in-time Reports (do NOT treat as current)

These are dated audit results, fix logs, QA runs, and planning notes. They are
**records of a past state** — re-reading them as "current guidance" is how the
staleness confusion in this folder started. Each is valid for *its* date only.
They are intentionally **not** rewritten (rewriting findings would falsify the
audit trail); instead, the current state lives in the canonical docs above.

### QA / audit snapshots (2026-10-30 era)
- `qa/2026-10-30-QA-CONSOLIDATED.md`, `qa/2026-10-30-qa-endpoints-roles.md`,
  `qa/2026-10-30-qa-mixed-roles.md`, `qa/2026-10-30-qa-admin.md`
- `release-readiness-985c30db.md` (readiness at that commit)
- `REMEDIATION_SUMMARY_PART_22.md`
- `self-hosted-architecture-audit.md`

### Fix / issue logs
- `FIXES.md`, `FIXES-2.md`, `FIXES_COOKIE_CUTTER_ALL_ROLES.md`
- `ISSUES_TRACKER.md`
- `UNWIRED-UI.md` (UI pages that were once unwired; now wired — historical)
- `docs/fixes/gate-claim-codes-missing-table.md`
- `quality/post-consolidation-fix-log.md`, `quality/post-consolidation-baseline.md`,
  `quality/post-consolidation-db-verification.md`,
  `quality/warden-principal-consolidation-audit.md`

### UX / unslop
- `ux-audit-setup.md`, `ux-panel-results.md`, `unslop/audit-report.md`
- `unslop-zero.md` (the zero-baseline policy doc — *this one is live policy*)

### Plans & blueprints (pre-implementation)
- `IMPLEMENTATION_BLUEPRINT.md`, `PRD.md`
- `plan/` (22 files — `principal-frontend-transformation-TRACKER.md`,
  `academics/ACADEMICS.md`, `class-coordinator-saas/*`)
- `principal/` (10 files — `pr-roadmap.md`, `pr16-verification-report.md`,
  `interaction-gap-register.md`, component/route inventories)
- `ROLE_EVOLUTION_2030.md` (forward-looking scenario, not a spec)

### Cutover / go-live (K-plan, point-in-time)
- `cutover/` (7 files — K1–K7 memos, hypercare, DPDP evidence pack)
- `operator-card/K5-operator-quick-reference.md`

### Other
- `architecture/auth-storage-decision.md` (decision record — stable)
- `design/entity-inspection-system.md`
- `hostel-hierarchy.md`, `JNTUH_CEJ_ROLE_HIERARCHY.md`, `ROLE_OPERATIONS.md`
  (role hierarchy references — check against `docs/roles/_overview.md`)
- `permission-workflow-architecture.md`, `permission-workflow.md`,
  `permission-workflow-sequences.md`
- `password-reset.md`, `unique-id-pattern.md`
- `GITHUB_FREE_SETUP.md`, `TELEGRAM_DEPLOY.md`, `SELF-HOSTED-SERVER.md`,
  `BRANCHING.md`, `BRANCH_RULES.md`, `PULL_MERGE_RULE.md`
- `HOME-PAGE-COLOR.md`, `CRYPTO-INVENTORY.md`, `backlog.md`
- `DECISIVE_REPLACEMENT_STACK_AND_HARDWARE_BOM (1).md` (hardware BOM reference)
- `PRINCIPAL_REBUILD_PROMPT.md` (a prompt, not a spec)

---

## C. Staleness notes (2026-11-25)

What changed and what to trust:

1. **Warden role removed** (migration `20261125000001`) — consolidated into
   `principal`. Live role registry: `src/lib/roles.ts`. Anything in older docs
   that lists a standalone `warden` user role is superseded; the
   hostel-management duty now lives in the principal's `assigned_hostel`
   hostel-block assignment + `deputy_warden` / `hostel_manager` tiers.
2. **AI model layer added** (commits `d907c125` → `15566037`) — 3 local
   workers (M1 `qwen3:1.7b`, M2 Tesseract/PaddleOCR sidecar, M3 `qwen2.5:3b`).
   Documented in `AI_ARCHITECTURE.md` + `AI_MODEL_COMPATIBILITY.md` and
   cross-referenced from `TECH_STACK.md`. No new infra: no vector DB, no
   embeddings, no reranker, no planner.
3. **SSE notification fix** (commit `dad3c040`) — `NotificationBell` now
   closes the `EventSource` on 401/403, falls back to 30 s polling, and bounds
   retries to 3. Supersedes any doc implying an infinite-reconnect SSE loop.
4. **RUNBOOK updated** for the live env-file layout (`.env` in the compose
   dir, synced with `/opt/monitoring/env/production.env`) and the live backup
   job (`/etc/cron.d/gate-backup` → `master-backup.sh`, every 6h — **not** the
   legacy nightly `backup-postgres.sh` cron).
5. **"Live console" generic footer + student greeting dedupe** (commit
   `34291f4a`) — `RoleChrome` no longer renders a "Live console / loading…"
   strip for roles without a status bar, and the student home shows a single
   structured greeting card (headline + role badge + subline + occasion wish).
