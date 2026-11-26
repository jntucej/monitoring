# Documentation Reconciliation Ledger

> **Mission:** Complete Documentation Reconciliation and Update
> **Started:** 2026-11-26
> **Status:** IN_PROGRESS

## Mission Status

- **Total documents discovered:** 312
- **Total documents processed:** 31
- **Documents verified current:** 19
- **Documents updated:** 12
- **Documents requiring investigation:** 0
- **Documents blocked:** 0
- **Remaining documents:** 281
- **Last completed document:** `docs/SEQ-IMPLEMENTATION-FRAMEWORK.md`
- **Current document:** `.github/PULL_REQUEST_TEMPLATE.md`
- **Next document:** `.github/agents/impeccable-asset-producer.agent.md`

## Excluded Third-Party / Vendor Documentation

- `.github/skills/impeccable/**` (46 files — third-party impeccable skill)
- `.hermes/skills/impeccable/**` (47 files — third-party impeccable skill)

## Document Processing Table

| # | Document | Priority | Status | Evidence collected | Updated | Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `.github/PULL_REQUEST_TEMPLATE.md` | MEDIUM | DISCOVERED | - | No | No |
| 2 | `.github/agents/impeccable-asset-producer.agent.md` | MEDIUM | DISCOVERED | - | No | No |
| 3 | `.github/agents/impeccable-documenter.agent.md` | MEDIUM | DISCOVERED | - | No | No |
| 4 | `.github/agents/impeccable-finish-reviewer.agent.md` | MEDIUM | DISCOVERED | - | No | No |
| 5 | `.github/agents/impeccable-manual-edit-applier.agent.md` | MEDIUM | DISCOVERED | - | No | No |
| 6 | `.hermes/skills/devops/self-hosted-service-ops/references/github-actions-deploy.md` | LOW | DISCOVERED | - | No | No |
| 7 | `AGENTS.md` | CRITICAL | COMPLETED | Verified Next.js 16 auto-generated agent rules block | No | Yes |
| 8 | `AUDIT_PROMPT.md` | LOW | COMPLETED | Verified mechanical hardening audit prompt (historical/prompt) | No | Yes |
| 9 | `CFPO_EXAM_ROLES.md` | LOW | COMPLETED | Verified stored spec for OIE/Exam Branch/Exam Superintendent console-shell migrations | No | Yes |
| 10 | `CHANGES.md` | LOW | COMPLETED | Verified historical decisions log for P0-P2 + Phase 5.5 pass | No | Yes |
| 11 | `CLAUDE.md` | CRITICAL | COMPLETED | Verified @AGENTS.md pointer | No | Yes |
| 12 | `CONSOLE_AUDIT_SPEC.md` | LOW | COMPLETED | Verified console audit spec (historical/spec) | No | Yes |
| 13 | `CONTRIBUTING.md` | CRITICAL | COMPLETED | Verified branching/PR/CODEOWNERS references against docs/BRANCHING.md and docs/GITHUB_FREE_SETUP.md | No | Yes |
| 14 | `DEPLOY_KEY_README.md` | CRITICAL | COMPLETED | Verified deploy key setup instructions | No | Yes |
| 15 | `HANDOVER.md` | CRITICAL | COMPLETED | Updated container list (gate_cloudflared, gate_falco, gate_node_exporter) and backup cron cadence (0 */6 * * * in /etc/cron.d/gate-backup) | Yes | Yes |
| 16 | `README.md` | CRITICAL | COMPLETED | Replaced accidental Gitleaks README with verified Gate Monitor stack/docs overview (package.json, docker-compose.yml, src/app, database/migrations, worker/jobs) | Yes | Yes |
| 17 | `README_CREDENTIALS.md` | CRITICAL | COMPLETED | Fixed provisioned role count (13->12 after warden removal) and repo path (/root/monitoring->/opt/monitoring/compose) | Yes | Yes |
| 18 | `REPO_SUMMARY.md` | CRITICAL | COMPLETED | Re-encoded UTF-16-LE to UTF-8 and added HISTORICAL (2026-10-07) status banner | Yes | Yes |
| 19 | `RUNBOOK-DR.md` | CRITICAL | COMPLETED | Updated backup frequency to match /etc/cron.d/gate-backup (0 */6 * * *) | Yes | Yes |
| 20 | `RUNBOOK.md` | CRITICAL | COMPLETED | Verified all referenced scripts (why-login-failed.sh, drills/run-all.sh, revoke-all-sessions.sh, verify-audit-chain.sh) and SQL/API paths | No | Yes |
| 21 | `TUNNEL.md` | CRITICAL | COMPLETED | Added token-managed auth model note matching cloudflared/config.yml and docs/RUNBOOK.md | Yes | Yes |
| 22 | `UX_FORENSICS_V4_5_LC_PRO/CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md` | LOW | DISCOVERED | - | No | No |
| 23 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_AUDIT_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 24 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_AUDIT_STATE.md` | LOW | DISCOVERED | - | No | No |
| 25 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_CHANGE_PREVIEW.md` | LOW | DISCOVERED | - | No | No |
| 26 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_GAP_REGISTER.md` | LOW | DISCOVERED | - | No | No |
| 27 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_INVENTORY.md` | LOW | DISCOVERED | - | No | No |
| 28 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_UPGRADE_PLAN.md` | LOW | DISCOVERED | - | No | No |
| 29 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_VALIDATION_PLAN.md` | LOW | DISCOVERED | - | No | No |
| 30 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/FINAL_UPGRADE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 31 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/POST_UPGRADE_VALIDATION.md` | LOW | DISCOVERED | - | No | No |
| 32 | `UX_FORENSICS_V4_5_LC_PRO/EVIDENCE/ACCESSIBILITY_RESPONSIVE_PERFORMANCE_PLAN.md` | LOW | DISCOVERED | - | No | No |
| 33 | `UX_FORENSICS_V4_5_LC_PRO/FINAL_REPORT/UX_PRODUCT_FORENSICS_V4_5.md` | LOW | DISCOVERED | - | No | No |
| 34 | `UX_FORENSICS_V4_5_LC_PRO/FINDINGS/FINDINGS_INDEX.md` | LOW | DISCOVERED | - | No | No |
| 35 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/EXECUTION_LOG.md` | LOW | DISCOVERED | - | No | No |
| 36 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/EXECUTION_RULES.md` | LOW | DISCOVERED | - | No | No |
| 37 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/FINAL_REPORT/FINAL_EXECUTION_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 38 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/IMPLEMENTATION_QUEUE.md` | LOW | DISCOVERED | - | No | No |
| 39 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/ISSUE_REGISTRY/ISSUE_INDEX.md` | LOW | DISCOVERED | - | No | No |
| 40 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/MASTER_STATE.md` | LOW | DISCOVERED | - | No | No |
| 41 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/PROGRESS_DASHBOARD.md` | LOW | DISCOVERED | - | No | No |
| 42 | `UX_FORENSICS_V4_5_LC_PRO/MASTER/GLOBAL_TASK_QUEUE.md` | LOW | DISCOVERED | - | No | No |
| 43 | `UX_FORENSICS_V4_5_LC_PRO/MASTER/MASTER_STATE.md` | LOW | DISCOVERED | - | No | No |
| 44 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/API_INDEX.md` | LOW | DISCOVERED | - | No | No |
| 45 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/COMPONENT_INDEX.md` | LOW | DISCOVERED | - | No | No |
| 46 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/DATA_MODEL.md` | LOW | DISCOVERED | - | No | No |
| 47 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/DESIGN_SYSTEM.md` | LOW | DISCOVERED | - | No | No |
| 48 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/NAVIGATION_MODEL.md` | LOW | DISCOVERED | - | No | No |
| 49 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/PRODUCT_CAPABILITIES.md` | LOW | DISCOVERED | - | No | No |
| 50 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/PRODUCT_MODEL.md` | LOW | DISCOVERED | - | No | No |
| 51 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/PROJECT_MAP.md` | LOW | DISCOVERED | - | No | No |
| 52 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/ROUTE_INDEX.md` | LOW | DISCOVERED | - | No | No |
| 53 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/UNKNOWN_AREAS.md` | LOW | DISCOVERED | - | No | No |
| 54 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 55 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/admin/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 56 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/caretaker/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 57 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/deputy_warden/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 58 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/emo/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 59 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/exam_branch/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 60 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/exam_superintendent/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 61 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/faculty/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 62 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/guardian/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 63 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/hod/ROLE_PROFILE.md` | LOW | DISCOVERED | - | No | No |
| 64 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/hod/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 65 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/hostel_manager/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 66 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/mess_incharge/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 67 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/oie/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 68 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/operator/ROLE_PROFILE.md` | LOW | DISCOVERED | - | No | No |
| 69 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/operator/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 70 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/principal/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 71 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/staff/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 72 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/student/ROLE_PROFILE.md` | LOW | DISCOVERED | - | No | No |
| 73 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/student/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 74 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/supervisor/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 75 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/sysadmin/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 76 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/vice_principal/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 77 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/visitor/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 78 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/worker/ROLE_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 79 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLE_INDEX.md` | LOW | DISCOVERED | - | No | No |
| 80 | `UX_FORENSICS_V4_5_LC_PRO/SIMULATIONS/SCENARIOS/SIMULATION_SCENARIOS.md` | LOW | DISCOVERED | - | No | No |
| 81 | `UX_FORENSICS_V4_5_LC_PRO/WORKFLOW_FORENSICS/WORKFLOWS/WORKFLOW_MAPS.md` | LOW | DISCOVERED | - | No | No |
| 82 | `UX_FORENSICS_V5/EXECUTION/CI-01/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 83 | `UX_FORENSICS_V5/EXECUTION/CI-02/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 84 | `UX_FORENSICS_V5/EXECUTION/CI-03/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 85 | `UX_FORENSICS_V5/EXECUTION/F-AD-04/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 86 | `UX_FORENSICS_V5/EXECUTION/F-HOD-03/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 87 | `UX_FORENSICS_V5/EXECUTION/TEST-01/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 88 | `UX_FORENSICS_V5/EXECUTION/TEST-02/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 89 | `UX_FORENSICS_V5/FINAL/FINAL_V5_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 90 | `UX_FORENSICS_V5/MASTER/EXECUTION_RULES.md` | LOW | DISCOVERED | - | No | No |
| 91 | `UX_FORENSICS_V5/MASTER/GLOBAL_QUEUE.md` | LOW | DISCOVERED | - | No | No |
| 92 | `UX_FORENSICS_V5/MASTER/MASTER_STATE.md` | LOW | DISCOVERED | - | No | No |
| 93 | `UX_FORENSICS_V5/SOURCE_INTELLIGENCE/PROJECT_MAP.md` | LOW | DISCOVERED | - | No | No |
| 94 | `UX_FORENSICS_V6/CONTROL/DECISIONS_REQUIRED.md` | LOW | DISCOVERED | - | No | No |
| 95 | `UX_FORENSICS_V6/CONTROL/GLOBAL_QUEUE.md` | LOW | DISCOVERED | - | No | No |
| 96 | `UX_FORENSICS_V6/CONTROL/MASTER_STATE.md` | LOW | DISCOVERED | - | No | No |
| 97 | `UX_FORENSICS_V6/FINAL/FINAL_V6_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 98 | `UX_FORENSICS_V6/TASKS/V6-01/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 99 | `UX_FORENSICS_V6/TASKS/V6-02/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 100 | `UX_FORENSICS_V7/CONTROL/MASTER_STATE.md` | LOW | DISCOVERED | - | No | No |
| 101 | `UX_FORENSICS_V7/FINAL/FINAL_V7_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 102 | `UX_FORENSICS_V7/GRAPH/TASK_GRAPH.md` | LOW | DISCOVERED | - | No | No |
| 103 | `UX_FORENSICS_V7/TASKS/V7-01/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 104 | `UX_FORENSICS_V7/TASKS/V7-02/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 105 | `UX_FORENSICS_V7/TASKS/V7-03/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 106 | `UX_FORENSICS_V7/TASKS/V7-04/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 107 | `UX_FORENSICS_V7/TASKS/V7-05/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 108 | `UX_FORENSICS_V7/TASKS/V7-06/FINAL.md` | LOW | DISCOVERED | - | No | No |
| 109 | `UX_FORENSICS_V8/CONTROL/MASTER_STATE.md` | LOW | DISCOVERED | - | No | No |
| 110 | `UX_FORENSICS_V8/FINAL/EXECUTIVE_SUMMARY.md` | LOW | DISCOVERED | - | No | No |
| 111 | `UX_FORENSICS_V8/FINAL/FINAL_V8_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 112 | `UX_FORENSICS_V8/FINAL/UNRESOLVED_REPORT.md` | LOW | DISCOVERED | - | No | No |
| 113 | `UX_FORENSICS_V8/FINDINGS/INDEX.md` | LOW | DISCOVERED | - | No | No |
| 114 | `UX_FORENSICS_V8/FINDINGS/UX-005.md` | LOW | DISCOVERED | - | No | No |
| 115 | `UX_PRODUCT_AUDIT_V2.md` | LOW | COMPLETED | Verified point-in-time UX & Product Audit V2.0 report | No | Yes |
| 116 | `compose/security/README.md` | HIGH | DISCOVERED | - | No | No |
| 117 | `docs/AI_ARCHITECTURE.md` | CRITICAL | COMPLETED | Verified 3-model AI layer + OmniRoute production runtime note | No | Yes |
| 118 | `docs/AI_MODEL_COMPATIBILITY.md` | HIGH | DISCOVERED | - | No | No |
| 119 | `docs/AUTONOMOUS_OPERATIONS.md` | CRITICAL | COMPLETED | Verified autonomous operations playbook and threat model | No | Yes |
| 120 | `docs/AUTO_DEPLOY.md` | CRITICAL | COMPLETED | Fixed .env path (/root/monitoring/.env -> /opt/monitoring/env/production.env) and removed trailing # test deploy | Yes | Yes |
| 121 | `docs/BASE-SETUP.md` | CRITICAL | COMPLETED | Clarified Windows/WSL2 scope vs Debian 13 production RUNBOOK.md | Yes | Yes |
| 122 | `docs/BRANCHING.md` | HIGH | DISCOVERED | - | No | No |
| 123 | `docs/BRANCH_RULES.md` | HIGH | DISCOVERED | - | No | No |
| 124 | `docs/CONTRACT.md` | CRITICAL | COMPLETED | Verified 4-tier shell/kernel contract + Teaching & Class-Comm addenda | No | Yes |
| 125 | `docs/CRYPTO-INVENTORY.md` | HIGH | DISCOVERED | - | No | No |
| 126 | `docs/DECISIVE_REPLACEMENT_STACK_AND_HARDWARE_BOM (1).md` | HIGH | DISCOVERED | - | No | No |
| 127 | `docs/FIXES-2.md` | HIGH | DISCOVERED | - | No | No |
| 128 | `docs/FIXES.md` | HIGH | DISCOVERED | - | No | No |
| 129 | `docs/FIXES_COOKIE_CUTTER_ALL_ROLES.md` | HIGH | DISCOVERED | - | No | No |
| 130 | `docs/GITHUB_FREE_SETUP.md` | HIGH | DISCOVERED | - | No | No |
| 131 | `docs/HOME-PAGE-COLOR.md` | HIGH | DISCOVERED | - | No | No |
| 132 | `docs/IMPLEMENTATION_BLUEPRINT.md` | HIGH | DISCOVERED | - | No | No |
| 133 | `docs/INDEX.md` | CRITICAL | COMPLETED | Fixed SERVER_ARCHITECTURE.md summary (ollama -> llm-proxy, monitoring) | Yes | Yes |
| 134 | `docs/ISSUES_TRACKER.md` | HIGH | DISCOVERED | - | No | No |
| 135 | `docs/JNTUH_CEJ_ROLE_HIERARCHY.md` | HIGH | DISCOVERED | - | No | No |
| 136 | `docs/LOGICAL_ARCHITECTURE_COMPLETE.md` | HIGH | DISCOVERED | - | No | No |
| 137 | `docs/MIGRATION.md` | CRITICAL | COMPLETED | Verified historical Supabase->self-hosted Postgres 17 playbook | No | Yes |
| 138 | `docs/PERFORMANCE.md` | HIGH | DISCOVERED | - | No | No |
| 139 | `docs/PERMISSIONS_ARCHITECTURE.md` | CRITICAL | COMPLETED | Added title and cross-reference header to walkthrough excerpt | Yes | Yes |
| 140 | `docs/PRD.md` | HIGH | DISCOVERED | - | No | No |
| 141 | `docs/PRINCIPAL_REBUILD_PROMPT.md` | HIGH | DISCOVERED | - | No | No |
| 142 | `docs/PULL_MERGE_RULE.md` | HIGH | DISCOVERED | - | No | No |
| 143 | `docs/REMEDIATION_SUMMARY_PART_22.md` | HIGH | DISCOVERED | - | No | No |
| 144 | `docs/ROLE_EVOLUTION_2030.md` | HIGH | DISCOVERED | - | No | No |
| 145 | `docs/ROLE_OPERATIONS.md` | HIGH | DISCOVERED | - | No | No |
| 146 | `docs/RUNBOOK.md` | CRITICAL | COMPLETED | Verified live systemd, compose, /etc/cron.d/gate-backup, and 13 cron jobs | No | Yes |
| 147 | `docs/SECURITY.md` | CRITICAL | COMPLETED | Verified U3-U8.1 chain, rate-limit policies, entity/agent/two-person controls | No | Yes |
| 148 | `docs/SECURITY_CHECKLIST.md` | CRITICAL | COMPLETED | Verified U3-U8.1 and entity/agent checklist items | No | Yes |
| 149 | `docs/SELF-HOSTED-SERVER.md` | HIGH | DISCOVERED | - | No | No |
| 150 | `docs/SEQ-IMPLEMENTATION-FRAMEWORK.md` | CRITICAL | COMPLETED | Fixed Next.js 15->16 and cloudflare-ddns->gate_cloudflared in container table | Yes | Yes |
| 151 | `docs/SERVER_ARCHITECTURE.md` | CRITICAL | COMPLETED | Replaced cloudflare-ddns with actual docker-compose.yml services (gate_cloudflared, gate_falco, gate_node_exporter, gate_migrate) | Yes | Yes |
| 152 | `docs/TECH_STACK.md` | CRITICAL | COMPLETED | Verified Next.js 16.4.6, React 19.3.1, Zod 4.6.7, Postgres 17, Redis 7, AI layer | No | Yes |
| 153 | `docs/TELEGRAM_DEPLOY.md` | HIGH | DISCOVERED | - | No | No |
| 154 | `docs/U1-PREFLIGHT.md` | HIGH | DISCOVERED | - | No | No |
| 155 | `docs/UNWIRED-UI.md` | HIGH | DISCOVERED | - | No | No |
| 156 | `docs/WORKFLOW-ARCHITECTURE.md` | CRITICAL | COMPLETED | Verified all 7 .github/workflows/*.yml files match table | No | Yes |
| 157 | `docs/architecture/auth-storage-decision.md` | HIGH | DISCOVERED | - | No | No |
| 158 | `docs/backlog.md` | HIGH | DISCOVERED | - | No | No |
| 159 | `docs/cutover/K1-go-no-go-memo.md` | MEDIUM | DISCOVERED | - | No | No |
| 160 | `docs/cutover/K2-cutover-runbook.md` | MEDIUM | DISCOVERED | - | No | No |
| 161 | `docs/cutover/K3-hypercare-plan.md` | MEDIUM | DISCOVERED | - | No | No |
| 162 | `docs/cutover/K4-stakeholder-comms.md` | MEDIUM | DISCOVERED | - | No | No |
| 163 | `docs/cutover/K6-dpdp-evidence-pack.md` | MEDIUM | DISCOVERED | - | No | No |
| 164 | `docs/cutover/K7-first-30-days-watch-list.md` | MEDIUM | DISCOVERED | - | No | No |
| 165 | `docs/cutover/README.md` | MEDIUM | DISCOVERED | - | No | No |
| 166 | `docs/design/entity-inspection-system.md` | MEDIUM | DISCOVERED | - | No | No |
| 167 | `docs/fixes/gate-claim-codes-missing-table.md` | HIGH | DISCOVERED | - | No | No |
| 168 | `docs/future-docker-broker.md` | HIGH | DISCOVERED | - | No | No |
| 169 | `docs/gate-records-collision-report.md` | HIGH | DISCOVERED | - | No | No |
| 170 | `docs/gate/ACADEMIC-MESS-COLLISION-REPORT.md` | HIGH | DISCOVERED | - | No | No |
| 171 | `docs/gate/DOMAIN-ARCHITECTURE-REVIEW.md` | HIGH | DISCOVERED | - | No | No |
| 172 | `docs/gate/PREFLIGHT.md` | HIGH | DISCOVERED | - | No | No |
| 173 | `docs/gate/SPEC-VS-LIVE.md` | HIGH | DISCOVERED | - | No | No |
| 174 | `docs/hostel-hierarchy.md` | HIGH | DISCOVERED | - | No | No |
| 175 | `docs/kb/general/campus-rules.md` | HIGH | DISCOVERED | - | No | No |
| 176 | `docs/kb/student/pass-requests.md` | HIGH | DISCOVERED | - | No | No |
| 177 | `docs/kb/sysadmin/sysadmin-guide.md` | HIGH | DISCOVERED | - | No | No |
| 178 | `docs/kb/warden/warden-sop.md` | HIGH | DISCOVERED | - | No | No |
| 179 | `docs/operator-card/K5-operator-quick-reference.md` | MEDIUM | DISCOVERED | - | No | No |
| 180 | `docs/password-reset.md` | HIGH | DISCOVERED | - | No | No |
| 181 | `docs/permission-workflow-architecture.md` | HIGH | DISCOVERED | - | No | No |
| 182 | `docs/permission-workflow-sequences.md` | HIGH | DISCOVERED | - | No | No |
| 183 | `docs/permission-workflow.md` | HIGH | DISCOVERED | - | No | No |
| 184 | `docs/plan/ARCHITECTURE-INDEX.md` | MEDIUM | DISCOVERED | - | No | No |
| 185 | `docs/plan/HANDOFF-2026-11-22-gate-monitor.md` | MEDIUM | DISCOVERED | - | No | No |
| 186 | `docs/plan/academics/ACADEMICS.md` | MEDIUM | DISCOVERED | - | No | No |
| 187 | `docs/plan/class-coordinator-saas/FULL-HIERARCHY-AND-FLOWS.md` | MEDIUM | DISCOVERED | - | No | No |
| 188 | `docs/plan/class-coordinator-saas/README.md` | MEDIUM | DISCOVERED | - | No | No |
| 189 | `docs/plan/class-coordinator-saas/aggregation-agent.md` | MEDIUM | DISCOVERED | - | No | No |
| 190 | `docs/plan/class-coordinator-saas/class-message-relay.md` | MEDIUM | DISCOVERED | - | No | No |
| 191 | `docs/plan/class-coordinator-saas/class-requests.md` | MEDIUM | DISCOVERED | - | No | No |
| 192 | `docs/plan/class-coordinator-saas/coordinator-model.md` | MEDIUM | DISCOVERED | - | No | No |
| 193 | `docs/plan/gate-monitoring/GATE-MONITORING.md` | MEDIUM | DISCOVERED | - | No | No |
| 194 | `docs/plan/hostel/HOSTEL.md` | MEDIUM | DISCOVERED | - | No | No |
| 195 | `docs/plan/institutional/PR-01-contracts.md` | MEDIUM | DISCOVERED | - | No | No |
| 196 | `docs/plan/institutional/PR-02-case-engine.md` | MEDIUM | DISCOVERED | - | No | No |
| 197 | `docs/plan/institutional/PR-03-04-workflow-authority.md` | MEDIUM | DISCOVERED | - | No | No |
| 198 | `docs/plan/institutional/PR-05-07-escalation-decision-delegation.md` | MEDIUM | DISCOVERED | - | No | No |
| 199 | `docs/plan/institutional/PR-05A-interaction-coverage-AUDIT.md` | MEDIUM | DISCOVERED | - | No | No |
| 200 | `docs/plan/institutional/PR-08-11-impact-attention-emergency-audit.md` | MEDIUM | DISCOVERED | - | No | No |
| 201 | `docs/plan/institutional/PR-12-principal-command-center.md` | MEDIUM | DISCOVERED | - | No | No |
| 202 | `docs/plan/institutional/PR-13-gate-pass-migration.md` | MEDIUM | DISCOVERED | - | No | No |
| 203 | `docs/plan/institutional/PR-14-sod-security.md` | MEDIUM | DISCOVERED | - | No | No |
| 204 | `docs/plan/institutional/PR-15-e2e-verification.md` | MEDIUM | DISCOVERED | - | No | No |
| 205 | `docs/plan/principal-frontend-transformation-TRACKER.md` | MEDIUM | DISCOVERED | - | No | No |
| 206 | `docs/pre-deployment-readiness-audit.md` | HIGH | DISCOVERED | - | No | No |
| 207 | `docs/principal/api-and-permission-map.md` | MEDIUM | DISCOVERED | - | No | No |
| 208 | `docs/principal/architecture.md` | MEDIUM | DISCOVERED | - | No | No |
| 209 | `docs/principal/component-inventory.md` | MEDIUM | DISCOVERED | - | No | No |
| 210 | `docs/principal/experience-audit.md` | MEDIUM | DISCOVERED | - | No | No |
| 211 | `docs/principal/interaction-completeness-matrix.md` | MEDIUM | DISCOVERED | - | No | No |
| 212 | `docs/principal/interaction-gap-register.md` | MEDIUM | DISCOVERED | - | No | No |
| 213 | `docs/principal/pr-roadmap.md` | MEDIUM | DISCOVERED | - | No | No |
| 214 | `docs/principal/pr16-verification-report.md` | MEDIUM | DISCOVERED | - | No | No |
| 215 | `docs/principal/route-inventory.md` | MEDIUM | DISCOVERED | - | No | No |
| 216 | `docs/principal/visual-system.md` | MEDIUM | DISCOVERED | - | No | No |
| 217 | `docs/qa/2026-10-30-QA-CONSOLIDATED.md` | MEDIUM | DISCOVERED | - | No | No |
| 218 | `docs/qa/2026-10-30-qa-admin.md` | MEDIUM | DISCOVERED | - | No | No |
| 219 | `docs/qa/2026-10-30-qa-endpoints-roles.md` | MEDIUM | DISCOVERED | - | No | No |
| 220 | `docs/qa/2026-10-30-qa-mixed-roles.md` | MEDIUM | DISCOVERED | - | No | No |
| 221 | `docs/quality/API_TESTS.md` | MEDIUM | DISCOVERED | - | No | No |
| 222 | `docs/quality/ARCHITECTURE_MAP.md` | MEDIUM | DISCOVERED | - | No | No |
| 223 | `docs/quality/BASELINE.md` | MEDIUM | DISCOVERED | - | No | No |
| 224 | `docs/quality/CREDENTIAL_DRIFT_RUNBOOK.md` | MEDIUM | DISCOVERED | - | No | No |
| 225 | `docs/quality/DATABASE_AUDIT.md` | MEDIUM | DISCOVERED | - | No | No |
| 226 | `docs/quality/QUALITY_GAP_ANALYSIS.md` | MEDIUM | DISCOVERED | - | No | No |
| 227 | `docs/quality/SECURITY_AUDIT.md` | MEDIUM | DISCOVERED | - | No | No |
| 228 | `docs/quality/SERVICE_INVENTORY.md` | MEDIUM | DISCOVERED | - | No | No |
| 229 | `docs/quality/STATIC_ANALYSIS.md` | MEDIUM | DISCOVERED | - | No | No |
| 230 | `docs/quality/WORKER_REALTIME.md` | MEDIUM | DISCOVERED | - | No | No |
| 231 | `docs/quality/post-consolidation-authz-api-findings.md` | MEDIUM | DISCOVERED | - | No | No |
| 232 | `docs/quality/post-consolidation-baseline.md` | MEDIUM | DISCOVERED | - | No | No |
| 233 | `docs/quality/post-consolidation-db-verification.md` | MEDIUM | DISCOVERED | - | No | No |
| 234 | `docs/quality/post-consolidation-fix-log.md` | MEDIUM | DISCOVERED | - | No | No |
| 235 | `docs/quality/post-consolidation-reference-audit.md` | MEDIUM | DISCOVERED | - | No | No |
| 236 | `docs/quality/post-consolidation-test-report.md` | MEDIUM | DISCOVERED | - | No | No |
| 237 | `docs/quality/post-consolidation-ui-responsive.md` | MEDIUM | DISCOVERED | - | No | No |
| 238 | `docs/quality/warden-principal-consolidation-audit.md` | MEDIUM | DISCOVERED | - | No | No |
| 239 | `docs/quality/warden-principal-migration-plan.md` | MEDIUM | DISCOVERED | - | No | No |
| 240 | `docs/quality/warden-principal-test-report.md` | MEDIUM | DISCOVERED | - | No | No |
| 241 | `docs/release-readiness-985c30db.md` | HIGH | DISCOVERED | - | No | No |
| 242 | `docs/resource-relationship-map.md` | HIGH | DISCOVERED | - | No | No |
| 243 | `docs/roles/README.md` | HIGH | DISCOVERED | - | No | No |
| 244 | `docs/roles/_overview.md` | HIGH | DISCOVERED | - | No | No |
| 245 | `docs/roles/admin.md` | HIGH | DISCOVERED | - | No | No |
| 246 | `docs/roles/caretaker.md` | HIGH | DISCOVERED | - | No | No |
| 247 | `docs/roles/chief_warden.md` | HIGH | DISCOVERED | - | No | No |
| 248 | `docs/roles/cross-role-dependency.md` | HIGH | DISCOVERED | - | No | No |
| 249 | `docs/roles/customization.md` | HIGH | DISCOVERED | - | No | No |
| 250 | `docs/roles/dean.md` | HIGH | DISCOVERED | - | No | No |
| 251 | `docs/roles/deputy_warden.md` | HIGH | DISCOVERED | - | No | No |
| 252 | `docs/roles/emo.md` | HIGH | DISCOVERED | - | No | No |
| 253 | `docs/roles/exam_branch.md` | HIGH | DISCOVERED | - | No | No |
| 254 | `docs/roles/exam_superintendent.md` | HIGH | DISCOVERED | - | No | No |
| 255 | `docs/roles/faculty.md` | HIGH | DISCOVERED | - | No | No |
| 256 | `docs/roles/guardian.md` | HIGH | DISCOVERED | - | No | No |
| 257 | `docs/roles/hod.md` | HIGH | DISCOVERED | - | No | No |
| 258 | `docs/roles/hostel_manager.md` | HIGH | DISCOVERED | - | No | No |
| 259 | `docs/roles/mess_incharge.md` | HIGH | DISCOVERED | - | No | No |
| 260 | `docs/roles/oie.md` | HIGH | DISCOVERED | - | No | No |
| 261 | `docs/roles/operator.md` | HIGH | DISCOVERED | - | No | No |
| 262 | `docs/roles/parent.md` | HIGH | DISCOVERED | - | No | No |
| 263 | `docs/roles/principal.md` | HIGH | DISCOVERED | - | No | No |
| 264 | `docs/roles/staff.md` | HIGH | DISCOVERED | - | No | No |
| 265 | `docs/roles/student.md` | HIGH | DISCOVERED | - | No | No |
| 266 | `docs/roles/supervisor.md` | HIGH | DISCOVERED | - | No | No |
| 267 | `docs/roles/sysadmin.md` | HIGH | DISCOVERED | - | No | No |
| 268 | `docs/roles/vice_principal.md` | HIGH | DISCOVERED | - | No | No |
| 269 | `docs/roles/visitor.md` | HIGH | DISCOVERED | - | No | No |
| 270 | `docs/roles/worker.md` | HIGH | DISCOVERED | - | No | No |
| 271 | `docs/runbooks/audit-tamper.md` | HIGH | DISCOVERED | - | No | No |
| 272 | `docs/runbooks/deploy-rollback.md` | HIGH | DISCOVERED | - | No | No |
| 273 | `docs/runbooks/disk-free-low.md` | HIGH | DISCOVERED | - | No | No |
| 274 | `docs/runbooks/gate-offline.md` | HIGH | DISCOVERED | - | No | No |
| 275 | `docs/runbooks/login-failures.md` | HIGH | DISCOVERED | - | No | No |
| 276 | `docs/runbooks/predictor-stale.md` | HIGH | DISCOVERED | - | No | No |
| 277 | `docs/runbooks/queue-backlog.md` | HIGH | DISCOVERED | - | No | No |
| 278 | `docs/runbooks/scan-duplicates.md` | HIGH | DISCOVERED | - | No | No |
| 279 | `docs/runbooks/telegram-down.md` | HIGH | DISCOVERED | - | No | No |
| 280 | `docs/runbooks/worker-down.md` | HIGH | DISCOVERED | - | No | No |
| 281 | `docs/self-hosted-architecture-audit.md` | HIGH | DISCOVERED | - | No | No |
| 282 | `docs/student-personas-passes.md` | HIGH | DISCOVERED | - | No | No |
| 283 | `docs/teaching-capability-architecture.md` | HIGH | DISCOVERED | - | No | No |
| 284 | `docs/u10-s3-offsite-setup.md` | HIGH | DISCOVERED | - | No | No |
| 285 | `docs/u3-audit.md` | HIGH | DISCOVERED | - | No | No |
| 286 | `docs/u4-audit-and-proposal.md` | HIGH | DISCOVERED | - | No | No |
| 287 | `docs/u5-audit-and-proposal.md` | HIGH | DISCOVERED | - | No | No |
| 288 | `docs/u6-audit-and-proposal.md` | HIGH | DISCOVERED | - | No | No |
| 289 | `docs/u7-audit-and-proposal.md` | HIGH | DISCOVERED | - | No | No |
| 290 | `docs/u7-phase2-audit.md` | HIGH | DISCOVERED | - | No | No |
| 291 | `docs/u7-phase3-audit.md` | HIGH | DISCOVERED | - | No | No |
| 292 | `docs/ui-architecture.md` | CRITICAL | DISCOVERED | - | No | No |
| 293 | `docs/ui-interaction-inventory.md` | HIGH | DISCOVERED | - | No | No |
| 294 | `docs/ui-page-coverage-matrix.md` | HIGH | DISCOVERED | - | No | No |
| 295 | `docs/unique-id-pattern.md` | HIGH | DISCOVERED | - | No | No |
| 296 | `docs/unslop-zero.md` | HIGH | DISCOVERED | - | No | No |
| 297 | `docs/unslop/audit-report.md` | MEDIUM | DISCOVERED | - | No | No |
| 298 | `docs/ux-audit-setup.md` | HIGH | DISCOVERED | - | No | No |
| 299 | `docs/ux-panel-results.md` | HIGH | DISCOVERED | - | No | No |
| 300 | `k8s/README.md` | HIGH | DISCOVERED | - | No | No |
| 301 | `packages/ai-scheduler-kit/README.md` | MEDIUM | DISCOVERED | - | No | No |
| 302 | `packages/ai-scheduler-kit/SCRIPTS.md` | MEDIUM | DISCOVERED | - | No | No |
| 303 | `public/sakuga-vfx-button/README.md` | LOW | DISCOVERED | - | No | No |
| 304 | `release-evidence/985c30db/contrast-audit-result.md` | LOW | DISCOVERED | - | No | No |
| 305 | `scripts/UI-REFACTOR-README.md` | HIGH | DISCOVERED | - | No | No |
| 306 | `scripts/qa-findings/desktop-summary.md` | HIGH | DISCOVERED | - | No | No |
| 307 | `scripts/sync-bridge/README.md` | HIGH | DISCOVERED | - | No | No |
| 308 | `security/zap-gate.md` | HIGH | DISCOVERED | - | No | No |
| 309 | `skill_responsive_grid.md` | LOW | DISCOVERED | - | No | No |
| 310 | `skills/grid-responsive.md` | MEDIUM | DISCOVERED | - | No | No |
| 311 | `skills/layout/grid-responsive.md` | MEDIUM | DISCOVERED | - | No | No |
| 312 | `skills/spacing-scale.md` | MEDIUM | DISCOVERED | - | No | No |
