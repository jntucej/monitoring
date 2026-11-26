# Documentation Reconciliation Ledger

> **Mission:** Complete Documentation Reconciliation and Update
> **Started:** 2026-11-26
> **Status:** COMPLETED (2026-11-26)

## Mission Status

- **Total documents discovered:** 312
- **Total documents processed:** 312
- **Documents verified current:** 293
- **Documents updated:** 19
- **Documents requiring investigation:** 0
- **Documents blocked:** 0
- **Remaining documents:** 0
- **Last completed document:** `UX_FORENSICS_V8/FINDINGS/UX-005.md`
- **Current document:** `None`
- **Next document:** `None`

## Excluded Third-Party / Vendor Documentation

- `.github/skills/impeccable/**` (46 files — third-party impeccable skill)
- `.hermes/skills/impeccable/**` (47 files — third-party impeccable skill)

## Document Processing Table

| # | Document | Priority | Status | Evidence collected | Updated | Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `.github/PULL_REQUEST_TEMPLATE.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 2 | `.github/agents/impeccable-asset-producer.agent.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 3 | `.github/agents/impeccable-documenter.agent.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 4 | `.github/agents/impeccable-finish-reviewer.agent.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 5 | `.github/agents/impeccable-manual-edit-applier.agent.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 6 | `.hermes/skills/devops/self-hosted-service-ops/references/github-actions-deploy.md` | LOW | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
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
| 22 | `UX_FORENSICS_V4_5_LC_PRO/CROSS_ROLE_FORENSICS/PERMISSION_INCONSISTENCIES.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 23 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_AUDIT_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 24 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_AUDIT_STATE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 25 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_CHANGE_PREVIEW.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 26 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_GAP_REGISTER.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 27 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_INVENTORY.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 28 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_UPGRADE_PLAN.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 29 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/DOCUMENTATION_VALIDATION_PLAN.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 30 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/FINAL_UPGRADE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 31 | `UX_FORENSICS_V4_5_LC_PRO/DOCUMENTATION_UPGRADE/POST_UPGRADE_VALIDATION.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 32 | `UX_FORENSICS_V4_5_LC_PRO/EVIDENCE/ACCESSIBILITY_RESPONSIVE_PERFORMANCE_PLAN.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 33 | `UX_FORENSICS_V4_5_LC_PRO/FINAL_REPORT/UX_PRODUCT_FORENSICS_V4_5.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 34 | `UX_FORENSICS_V4_5_LC_PRO/FINDINGS/FINDINGS_INDEX.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 35 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/EXECUTION_LOG.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 36 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/EXECUTION_RULES.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 37 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/FINAL_REPORT/FINAL_EXECUTION_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 38 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/IMPLEMENTATION_QUEUE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 39 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/ISSUE_REGISTRY/ISSUE_INDEX.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 40 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/MASTER_STATE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 41 | `UX_FORENSICS_V4_5_LC_PRO/IMPLEMENTATION/PROGRESS_DASHBOARD.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 42 | `UX_FORENSICS_V4_5_LC_PRO/MASTER/GLOBAL_TASK_QUEUE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 43 | `UX_FORENSICS_V4_5_LC_PRO/MASTER/MASTER_STATE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 44 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/API_INDEX.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 45 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/COMPONENT_INDEX.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 46 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/DATA_MODEL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 47 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/DESIGN_SYSTEM.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 48 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/NAVIGATION_MODEL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 49 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/PRODUCT_CAPABILITIES.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 50 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/PRODUCT_MODEL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 51 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/PROJECT_MAP.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 52 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/ROUTE_INDEX.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 53 | `UX_FORENSICS_V4_5_LC_PRO/PRODUCT_INTELLIGENCE/UNKNOWN_AREAS.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 54 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 55 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/admin/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 56 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/caretaker/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 57 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/deputy_warden/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 58 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/emo/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 59 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/exam_branch/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 60 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/exam_superintendent/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 61 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/faculty/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 62 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/guardian/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 63 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/hod/ROLE_PROFILE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 64 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/hod/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 65 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/hostel_manager/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 66 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/mess_incharge/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 67 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/oie/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 68 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/operator/ROLE_PROFILE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 69 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/operator/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 70 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/principal/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 71 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/staff/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 72 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/student/ROLE_PROFILE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 73 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/student/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 74 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/supervisor/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 75 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/sysadmin/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 76 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/vice_principal/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 77 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/visitor/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 78 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLES/worker/ROLE_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 79 | `UX_FORENSICS_V4_5_LC_PRO/ROLE_INTELLIGENCE/ROLE_INDEX.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 80 | `UX_FORENSICS_V4_5_LC_PRO/SIMULATIONS/SCENARIOS/SIMULATION_SCENARIOS.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 81 | `UX_FORENSICS_V4_5_LC_PRO/WORKFLOW_FORENSICS/WORKFLOWS/WORKFLOW_MAPS.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 82 | `UX_FORENSICS_V5/EXECUTION/CI-01/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 83 | `UX_FORENSICS_V5/EXECUTION/CI-02/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 84 | `UX_FORENSICS_V5/EXECUTION/CI-03/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 85 | `UX_FORENSICS_V5/EXECUTION/F-AD-04/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 86 | `UX_FORENSICS_V5/EXECUTION/F-HOD-03/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 87 | `UX_FORENSICS_V5/EXECUTION/TEST-01/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 88 | `UX_FORENSICS_V5/EXECUTION/TEST-02/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 89 | `UX_FORENSICS_V5/FINAL/FINAL_V5_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 90 | `UX_FORENSICS_V5/MASTER/EXECUTION_RULES.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 91 | `UX_FORENSICS_V5/MASTER/GLOBAL_QUEUE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 92 | `UX_FORENSICS_V5/MASTER/MASTER_STATE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 93 | `UX_FORENSICS_V5/SOURCE_INTELLIGENCE/PROJECT_MAP.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 94 | `UX_FORENSICS_V6/CONTROL/DECISIONS_REQUIRED.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 95 | `UX_FORENSICS_V6/CONTROL/GLOBAL_QUEUE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 96 | `UX_FORENSICS_V6/CONTROL/MASTER_STATE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 97 | `UX_FORENSICS_V6/FINAL/FINAL_V6_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 98 | `UX_FORENSICS_V6/TASKS/V6-01/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 99 | `UX_FORENSICS_V6/TASKS/V6-02/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 100 | `UX_FORENSICS_V7/CONTROL/MASTER_STATE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 101 | `UX_FORENSICS_V7/FINAL/FINAL_V7_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 102 | `UX_FORENSICS_V7/GRAPH/TASK_GRAPH.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 103 | `UX_FORENSICS_V7/TASKS/V7-01/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 104 | `UX_FORENSICS_V7/TASKS/V7-02/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 105 | `UX_FORENSICS_V7/TASKS/V7-03/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 106 | `UX_FORENSICS_V7/TASKS/V7-04/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 107 | `UX_FORENSICS_V7/TASKS/V7-05/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 108 | `UX_FORENSICS_V7/TASKS/V7-06/FINAL.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 109 | `UX_FORENSICS_V8/CONTROL/MASTER_STATE.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 110 | `UX_FORENSICS_V8/FINAL/EXECUTIVE_SUMMARY.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 111 | `UX_FORENSICS_V8/FINAL/FINAL_V8_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 112 | `UX_FORENSICS_V8/FINAL/UNRESOLVED_REPORT.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 113 | `UX_FORENSICS_V8/FINDINGS/INDEX.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 114 | `UX_FORENSICS_V8/FINDINGS/UX-005.md` | LOW | COMPLETED | Verified historical UX_FORENSICS point-in-time audit/execution artifact (preserved as-is) | No | Yes |
| 115 | `UX_PRODUCT_AUDIT_V2.md` | LOW | COMPLETED | Verified point-in-time UX & Product Audit V2.0 report | No | Yes |
| 116 | `compose/security/README.md` | HIGH | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 117 | `docs/AI_ARCHITECTURE.md` | CRITICAL | COMPLETED | Verified 3-model AI layer + OmniRoute production runtime note | No | Yes |
| 118 | `docs/AI_MODEL_COMPATIBILITY.md` | HIGH | COMPLETED | Verified hardware/model compatibility report (i7-12700, 15 GiB RAM, Tesseract 5, qwen3:1.7b, qwen2.5:3b) | No | Yes |
| 119 | `docs/AUTONOMOUS_OPERATIONS.md` | CRITICAL | COMPLETED | Verified autonomous operations playbook and threat model | No | Yes |
| 120 | `docs/AUTO_DEPLOY.md` | CRITICAL | COMPLETED | Fixed .env path (/root/monitoring/.env -> /opt/monitoring/env/production.env) and removed trailing # test deploy | Yes | Yes |
| 121 | `docs/BASE-SETUP.md` | CRITICAL | COMPLETED | Clarified Windows/WSL2 scope vs Debian 13 production RUNBOOK.md | Yes | Yes |
| 122 | `docs/BRANCHING.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 123 | `docs/BRANCH_RULES.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 124 | `docs/CONTRACT.md` | CRITICAL | COMPLETED | Verified 4-tier shell/kernel contract + Teaching & Class-Comm addenda | No | Yes |
| 125 | `docs/CRYPTO-INVENTORY.md` | HIGH | COMPLETED | Verified Batch L7 cryptographic boundary inventory | No | Yes |
| 126 | `docs/DECISIVE_REPLACEMENT_STACK_AND_HARDWARE_BOM (1).md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 127 | `docs/FIXES-2.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 128 | `docs/FIXES.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 129 | `docs/FIXES_COOKIE_CUTTER_ALL_ROLES.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 130 | `docs/GITHUB_FREE_SETUP.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 131 | `docs/HOME-PAGE-COLOR.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 132 | `docs/IMPLEMENTATION_BLUEPRINT.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 133 | `docs/INDEX.md` | CRITICAL | COMPLETED | Fixed SERVER_ARCHITECTURE.md summary (ollama -> llm-proxy, monitoring) | Yes | Yes |
| 134 | `docs/ISSUES_TRACKER.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 135 | `docs/JNTUH_CEJ_ROLE_HIERARCHY.md` | HIGH | COMPLETED | Verified JNTUH CEJ entity-aligned role hierarchy | No | Yes |
| 136 | `docs/LOGICAL_ARCHITECTURE_COMPLETE.md` | HIGH | COMPLETED | Verified pointer doc to CONTRACT, SERVER_ARCHITECTURE, TECH_STACK, MIGRATION, AUTONOMOUS_OPERATIONS | No | Yes |
| 137 | `docs/MIGRATION.md` | CRITICAL | COMPLETED | Verified historical Supabase->self-hosted Postgres 17 playbook | No | Yes |
| 138 | `docs/PERFORMANCE.md` | HIGH | COMPLETED | Fixed CI workflow reference (.github/workflows/perf.yml -> infrastructure.yml performance job) | Yes | Yes |
| 139 | `docs/PERMISSIONS_ARCHITECTURE.md` | CRITICAL | COMPLETED | Added title and cross-reference header to walkthrough excerpt | Yes | Yes |
| 140 | `docs/PRD.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 141 | `docs/PRINCIPAL_REBUILD_PROMPT.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 142 | `docs/PULL_MERGE_RULE.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 143 | `docs/REMEDIATION_SUMMARY_PART_22.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 144 | `docs/ROLE_EVOLUTION_2030.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 145 | `docs/ROLE_OPERATIONS.md` | HIGH | COMPLETED | Verified 583-route role operations map (2026-11-17) and chief_warden/warden notes | No | Yes |
| 146 | `docs/RUNBOOK.md` | CRITICAL | COMPLETED | Verified live systemd, compose, /etc/cron.d/gate-backup, and 13 cron jobs | No | Yes |
| 147 | `docs/SECURITY.md` | CRITICAL | COMPLETED | Verified U3-U8.1 chain, rate-limit policies, entity/agent/two-person controls | No | Yes |
| 148 | `docs/SECURITY_CHECKLIST.md` | CRITICAL | COMPLETED | Verified U3-U8.1 and entity/agent checklist items | No | Yes |
| 149 | `docs/SELF-HOSTED-SERVER.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 150 | `docs/SEQ-IMPLEMENTATION-FRAMEWORK.md` | CRITICAL | COMPLETED | Fixed Next.js 15->16 and cloudflare-ddns->gate_cloudflared in container table | Yes | Yes |
| 151 | `docs/SERVER_ARCHITECTURE.md` | CRITICAL | COMPLETED | Replaced cloudflare-ddns with actual docker-compose.yml services (gate_cloudflared, gate_falco, gate_node_exporter, gate_migrate) | Yes | Yes |
| 152 | `docs/TECH_STACK.md` | CRITICAL | COMPLETED | Verified Next.js 16.4.6, React 19.3.1, Zod 4.6.7, Postgres 17, Redis 7, AI layer | No | Yes |
| 153 | `docs/TELEGRAM_DEPLOY.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 154 | `docs/U1-PREFLIGHT.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 155 | `docs/UNWIRED-UI.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 156 | `docs/WORKFLOW-ARCHITECTURE.md` | CRITICAL | COMPLETED | Verified all 7 .github/workflows/*.yml files match table | No | Yes |
| 157 | `docs/architecture/auth-storage-decision.md` | HIGH | COMPLETED | Verified sessionStorage authStore persistence ADR | No | Yes |
| 158 | `docs/backlog.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 159 | `docs/cutover/K1-go-no-go-memo.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 160 | `docs/cutover/K2-cutover-runbook.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 161 | `docs/cutover/K3-hypercare-plan.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 162 | `docs/cutover/K4-stakeholder-comms.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 163 | `docs/cutover/K6-dpdp-evidence-pack.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 164 | `docs/cutover/K7-first-30-days-watch-list.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 165 | `docs/cutover/README.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 166 | `docs/design/entity-inspection-system.md` | MEDIUM | COMPLETED | Verified EntityInspector, HoverPreview, useEntityInspector, and wired pages | No | Yes |
| 167 | `docs/fixes/gate-claim-codes-missing-table.md` | HIGH | COMPLETED | Verified historical fix record for gate_claim_codes migration | No | Yes |
| 168 | `docs/future-docker-broker.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 169 | `docs/gate-records-collision-report.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 170 | `docs/gate/ACADEMIC-MESS-COLLISION-REPORT.md` | HIGH | COMPLETED | Verified 2026-11-25 collision report against live schema | No | Yes |
| 171 | `docs/gate/DOMAIN-ARCHITECTURE-REVIEW.md` | HIGH | COMPLETED | Verified domain architecture review against live schema and rollNumber.ts | No | Yes |
| 172 | `docs/gate/PREFLIGHT.md` | HIGH | COMPLETED | Verified gate records pre-flight verification against live DB | No | Yes |
| 173 | `docs/gate/SPEC-VS-LIVE.md` | HIGH | COMPLETED | Verified gate records spec vs live schema collision report | No | Yes |
| 174 | `docs/hostel-hierarchy.md` | HIGH | COMPLETED | Verified 4-level hostel approval chain and entry-type button matrix | No | Yes |
| 175 | `docs/kb/general/campus-rules.md` | HIGH | COMPLETED | Verified campus rules and curfew KB entry | No | Yes |
| 176 | `docs/kb/student/pass-requests.md` | HIGH | COMPLETED | Verified student pass request flow KB entry | No | Yes |
| 177 | `docs/kb/sysadmin/sysadmin-guide.md` | HIGH | COMPLETED | Replaced getSupabaseServiceClient() with src/lib/postgres.ts (query/withTransaction) | Yes | Yes |
| 178 | `docs/kb/warden/warden-sop.md` | HIGH | COMPLETED | Added role consolidation note (warden -> principal/deputy_warden/hostel_manager) | Yes | Yes |
| 179 | `docs/operator-card/K5-operator-quick-reference.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 180 | `docs/password-reset.md` | HIGH | COMPLETED | Verified bcrypt credential hashing, login, pin-login, and enrollment flows | No | Yes |
| 181 | `docs/permission-workflow-architecture.md` | HIGH | COMPLETED | Fixed empty section headings (1 & 3) and added 2026-11 warden->principal consolidation note | Yes | Yes |
| 182 | `docs/permission-workflow-sequences.md` | HIGH | COMPLETED | Verified Mermaid sequence diagrams for permission workflows | No | Yes |
| 183 | `docs/permission-workflow.md` | HIGH | COMPLETED | Verified 4 workflows, API endpoints, and 2026-11 entity-aligned role update | No | Yes |
| 184 | `docs/plan/ARCHITECTURE-INDEX.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 185 | `docs/plan/HANDOFF-2026-11-22-gate-monitor.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 186 | `docs/plan/academics/ACADEMICS.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 187 | `docs/plan/class-coordinator-saas/FULL-HIERARCHY-AND-FLOWS.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 188 | `docs/plan/class-coordinator-saas/README.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 189 | `docs/plan/class-coordinator-saas/aggregation-agent.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 190 | `docs/plan/class-coordinator-saas/class-message-relay.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 191 | `docs/plan/class-coordinator-saas/class-requests.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 192 | `docs/plan/class-coordinator-saas/coordinator-model.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 193 | `docs/plan/gate-monitoring/GATE-MONITORING.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 194 | `docs/plan/hostel/HOSTEL.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 195 | `docs/plan/institutional/PR-01-contracts.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 196 | `docs/plan/institutional/PR-02-case-engine.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 197 | `docs/plan/institutional/PR-03-04-workflow-authority.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 198 | `docs/plan/institutional/PR-05-07-escalation-decision-delegation.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 199 | `docs/plan/institutional/PR-05A-interaction-coverage-AUDIT.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 200 | `docs/plan/institutional/PR-08-11-impact-attention-emergency-audit.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 201 | `docs/plan/institutional/PR-12-principal-command-center.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 202 | `docs/plan/institutional/PR-13-gate-pass-migration.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 203 | `docs/plan/institutional/PR-14-sod-security.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 204 | `docs/plan/institutional/PR-15-e2e-verification.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 205 | `docs/plan/principal-frontend-transformation-TRACKER.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 206 | `docs/pre-deployment-readiness-audit.md` | HIGH | COMPLETED | Verified deployed U3-U8.1 readiness & rollback record | No | Yes |
| 207 | `docs/principal/api-and-permission-map.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 208 | `docs/principal/architecture.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 209 | `docs/principal/component-inventory.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 210 | `docs/principal/experience-audit.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 211 | `docs/principal/interaction-completeness-matrix.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 212 | `docs/principal/interaction-gap-register.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 213 | `docs/principal/pr-roadmap.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 214 | `docs/principal/pr16-verification-report.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 215 | `docs/principal/route-inventory.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 216 | `docs/principal/visual-system.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 217 | `docs/qa/2026-10-30-QA-CONSOLIDATED.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 218 | `docs/qa/2026-10-30-qa-admin.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 219 | `docs/qa/2026-10-30-qa-endpoints-roles.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 220 | `docs/qa/2026-10-30-qa-mixed-roles.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 221 | `docs/quality/API_TESTS.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 222 | `docs/quality/ARCHITECTURE_MAP.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 223 | `docs/quality/BASELINE.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 224 | `docs/quality/CREDENTIAL_DRIFT_RUNBOOK.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 225 | `docs/quality/DATABASE_AUDIT.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 226 | `docs/quality/QUALITY_GAP_ANALYSIS.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 227 | `docs/quality/SECURITY_AUDIT.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 228 | `docs/quality/SERVICE_INVENTORY.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 229 | `docs/quality/STATIC_ANALYSIS.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 230 | `docs/quality/WORKER_REALTIME.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 231 | `docs/quality/post-consolidation-authz-api-findings.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 232 | `docs/quality/post-consolidation-baseline.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 233 | `docs/quality/post-consolidation-db-verification.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 234 | `docs/quality/post-consolidation-fix-log.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 235 | `docs/quality/post-consolidation-reference-audit.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 236 | `docs/quality/post-consolidation-test-report.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 237 | `docs/quality/post-consolidation-ui-responsive.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 238 | `docs/quality/warden-principal-consolidation-audit.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 239 | `docs/quality/warden-principal-migration-plan.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 240 | `docs/quality/warden-principal-test-report.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 241 | `docs/release-readiness-985c30db.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 242 | `docs/resource-relationship-map.md` | HIGH | COMPLETED | Verified core entity graph and route links | No | Yes |
| 243 | `docs/roles/README.md` | HIGH | COMPLETED | Verified role operations index and shared auth/RBAC facts | No | Yes |
| 244 | `docs/roles/_overview.md` | HIGH | COMPLETED | Fixed unclosed backtick on Authorization header; verified 28 active roles and RBAC flow | Yes | Yes |
| 245 | `docs/roles/admin.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 246 | `docs/roles/caretaker.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 247 | `docs/roles/chief_warden.md` | HIGH | COMPLETED | Verified chief_warden role_context documentation for Principal | No | Yes |
| 248 | `docs/roles/cross-role-dependency.md` | HIGH | COMPLETED | Verified cross-role capability sharing matrix | No | Yes |
| 249 | `docs/roles/customization.md` | HIGH | COMPLETED | Verified 6-layer preference cascade, 91-key registry, traits, and explicit settings | No | Yes |
| 250 | `docs/roles/dean.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 251 | `docs/roles/deputy_warden.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 252 | `docs/roles/emo.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 253 | `docs/roles/exam_branch.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 254 | `docs/roles/exam_superintendent.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 255 | `docs/roles/faculty.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 256 | `docs/roles/guardian.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 257 | `docs/roles/hod.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 258 | `docs/roles/hostel_manager.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 259 | `docs/roles/mess_incharge.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 260 | `docs/roles/oie.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 261 | `docs/roles/operator.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 262 | `docs/roles/parent.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 263 | `docs/roles/principal.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 264 | `docs/roles/staff.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 265 | `docs/roles/student.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 266 | `docs/roles/supervisor.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 267 | `docs/roles/sysadmin.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 268 | `docs/roles/vice_principal.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 269 | `docs/roles/visitor.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 270 | `docs/roles/worker.md` | HIGH | COMPLETED | Verified all referenced /api/* routes exist in src/app/api/ and role aligns with src/lib/roles.ts | No | Yes |
| 271 | `docs/runbooks/audit-tamper.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 272 | `docs/runbooks/deploy-rollback.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 273 | `docs/runbooks/disk-free-low.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 274 | `docs/runbooks/gate-offline.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 275 | `docs/runbooks/login-failures.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 276 | `docs/runbooks/predictor-stale.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 277 | `docs/runbooks/queue-backlog.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 278 | `docs/runbooks/scan-duplicates.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 279 | `docs/runbooks/telegram-down.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 280 | `docs/runbooks/worker-down.md` | HIGH | COMPLETED | Verified runbook commands, container names, SQL queries, and escalation paths | No | Yes |
| 281 | `docs/self-hosted-architecture-audit.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 282 | `docs/student-personas-passes.md` | HIGH | COMPLETED | Fixed markdown bold typo on hosteller row; verified pass-types.ts alignment | Yes | Yes |
| 283 | `docs/teaching-capability-architecture.md` | HIGH | COMPLETED | Verified teaching-binding, action-envelope, and academic subsystem | No | Yes |
| 284 | `docs/u10-s3-offsite-setup.md` | HIGH | COMPLETED | Verified S3 offsite backup env vars and backup_policies SQL | No | Yes |
| 285 | `docs/u3-audit.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 286 | `docs/u4-audit-and-proposal.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 287 | `docs/u5-audit-and-proposal.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 288 | `docs/u6-audit-and-proposal.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 289 | `docs/u7-audit-and-proposal.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 290 | `docs/u7-phase2-audit.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 291 | `docs/u7-phase3-audit.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 292 | `docs/ui-architecture.md` | CRITICAL | COMPLETED | Verified 467 pages, 675 components, 798 API routes, RoleResponsiveShell | No | Yes |
| 293 | `docs/ui-interaction-inventory.md` | HIGH | COMPLETED | Verified UI interaction inventory (dead links, CSS typos, stubs, 21 KPI drill-downs) | No | Yes |
| 294 | `docs/ui-page-coverage-matrix.md` | HIGH | COMPLETED | Verified 466/466 live browser coverage matrix @ d2341ae7 | No | Yes |
| 295 | `docs/unique-id-pattern.md` | HIGH | COMPLETED | Verified ucej-{rolePrefix}-{NNNN} auto-generation in src/lib/db.ts | No | Yes |
| 296 | `docs/unslop-zero.md` | HIGH | COMPLETED | Verified zero-baseline unslop-ui policy and card-lasagna blind spot note | No | Yes |
| 297 | `docs/unslop/audit-report.md` | MEDIUM | COMPLETED | Verified title, scope, and point-in-time/plan/quality classification in docs/INDEX.md | No | Yes |
| 298 | `docs/ux-audit-setup.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 299 | `docs/ux-panel-results.md` | HIGH | COMPLETED | Verified title, scope, and historical/reference classification in docs/INDEX.md | No | Yes |
| 300 | `k8s/README.md` | HIGH | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 301 | `packages/ai-scheduler-kit/README.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 302 | `packages/ai-scheduler-kit/SCRIPTS.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 303 | `public/sakuga-vfx-button/README.md` | LOW | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 304 | `release-evidence/985c30db/contrast-audit-result.md` | LOW | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 305 | `scripts/UI-REFACTOR-README.md` | HIGH | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 306 | `scripts/qa-findings/desktop-summary.md` | HIGH | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 307 | `scripts/sync-bridge/README.md` | HIGH | COMPLETED | Added legacy Supabase-era & package.json script note | Yes | Yes |
| 308 | `security/zap-gate.md` | HIGH | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 309 | `skill_responsive_grid.md` | LOW | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 310 | `skills/grid-responsive.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 311 | `skills/layout/grid-responsive.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
| 312 | `skills/spacing-scale.md` | MEDIUM | COMPLETED | Verified title, scope, and project-owned status | No | Yes |
