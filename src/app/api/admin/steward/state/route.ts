// src/app/api/admin/steward/state/route.ts
// GET /api/admin/steward/state — ADMIN Office Steward dashboard state.
//
// Reads:
//   - delegations (pending + active Leave Delegates)
//   - delegation_rules (workflow configs)
//   - routing_policies (sla_timeout_hours, escalation chains)
//   - circular_requests (published/recalled office circulars)
//   - operational_announcements (live feed)
//   - fee_items + fee_payment_references (challan reconciliation)
//   - processed_events (dedup hits for UTR)
//   - retention_policies (archival counts)
//   - domain_outbox (DLQ status)
//   - llm_circuit_state (autopilot status)
//   - lifecycle_playbooks (rollover staging)
//   - academic_regulations + academic_policy_rules (steward drafts)
//   - users (admin identity)
//
// auth: ['admin'] only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

export const GET = withAuthorization(async (_req: NextRequest, { auth }: { auth: AuthContext }) => {
  if (!["admin"].includes(auth.role)) {
    return fail("FORBIDDEN", "ADMIN only", 403);
  }

  const now = Date.now();
  const [
    pendingDelegates,
    activeDelegates,
    routingPolicies,
    circulars,
    announcements,
    feeItems,
    paymentRefs,
    dedupHits,
    retentionPolicies,
    outboxCounts,
    outboxDlq,
    llmCircuit,
    lifecyclePlaybooks,
    academicRegs,
    policyRules,
  ] = await Promise.all([
    // Pending delegate nominations (requires_approval = true, not yet approved)
    query(
      `SELECT d.id, d.delegator_id AS delegatorId, d.delegatee_id AS delegateeId,
              d.role, d.scope_entity AS scopeEntity, d.can_mutate AS canMutate,
              d.starts_at AS startsAt, d.expires_at AS expiresAt, d.requires_approval AS requiresApproval,
              du.name AS delegateeName, du.role AS delegateeRole
         FROM delegations d
         LEFT JOIN users du ON d.delegatee_id = du.id
        WHERE d.requires_approval = TRUE
          AND d.revoked_at IS NULL
          AND d.expires_at > NOW()
        ORDER BY d.starts_at ASC LIMIT 50`,
    ),
    // Active delegates
    query(
      `SELECT d.id, d.delegator_id AS delegatorId, d.delegatee_id AS delegateeId,
              d.role, d.scope_entity AS scopeEntity, d.starts_at AS startsAt, d.expires_at AS expiresAt,
              du.name AS delegateeName, du.role AS delegateeRole
         FROM delegations d
         LEFT JOIN users du ON d.delegatee_id = du.id
        WHERE d.revoked_at IS NULL
          AND d.starts_at <= NOW()
          AND d.expires_at > NOW()
        ORDER BY d.expires_at ASC LIMIT 50`,
    ),
    // routing_policies with timeout_hours
    query(
      `SELECT id, policy_key AS policyKey, version, category, stage_1_role AS stage1Role,
              escalation_chain AS escalationChain, sla_timeout_hours AS slaTimeoutHours,
              allow_direct_bypass AS allowDirectBypass, status
         FROM routing_policies
        WHERE status = 'ACTIVE'
        ORDER BY policy_key LIMIT 50`,
    ),
    // circular_requests
    query(
      `SELECT id, title, circular_no AS circularNo, issued_by AS issuedBy,
              effective_date AS effectiveDate, deadline, status,
              supersedes_id AS supersedesId, withdrawn_at AS withdrawnAt,
              feed_item_id AS feedItemId, action_required AS actionRequired,
              created_at AS createdAt
         FROM circular_requests
        ORDER BY created_at DESC LIMIT 50`,
    ),
    // operational_announcements
    query(
      `SELECT id, title, category, state, publish_window AS publishWindow, created_at AS createdAt
         FROM operational_announcements
        ORDER BY created_at DESC LIMIT 30`,
    ),
    // fee_items (unpaid)
    query(
      `SELECT fee_type AS feeType, amount, paid, status, due_date AS dueDate, receipt_no AS receiptNo
         FROM fee_items
        WHERE status IN ('PENDING','OVERDUE','PARTIAL')
        ORDER BY due_date ASC LIMIT 100`,
    ),
    // fee_payment_references (challan ledger)
    query(
      `SELECT * FROM fee_payment_references ORDER BY created_at DESC LIMIT 50`,
    ),
    // processed_events dedup hits (biometric / sbi_collect)
    query(
      `SELECT source, event_type AS eventType, entity_ref AS entityRef, processed_at AS processedAt
         FROM processed_events
        WHERE event_type IN ('sbi_collect_payment','upi_payment','biometric_punch')
        ORDER BY processed_at DESC LIMIT 50`,
    ),
    // retention_policies
    query(
      `SELECT data_category AS dataCategory, retention_days AS retentionDays, auto_delete AS autoDelete
         FROM retention_policies
        ORDER BY data_category`,
    ),
    // domain_outbox counts
    query(
      `SELECT status, COUNT(*) AS count FROM domain_outbox GROUP BY status`,
    ),
    // domain_outbox DLQ
    query(
      `SELECT id, event_type AS eventType, attempts, last_error AS lastError, payload, created_at AS createdAt
         FROM domain_outbox
        WHERE status = 'DEAD_LETTER'
        ORDER BY created_at DESC LIMIT 50`,
    ),
    // llm_circuit_state
    query(
      `SELECT provider_key AS providerKey, circuit_open AS circuitOpen,
              consecutive_failures AS consecutiveFailures,
              last_failure_at AS lastFailureAt, last_success_at AS lastSuccessAt,
              half_open_probe_at AS halfOpenProbeAt, updated_at AS updatedAt
         FROM llm_circuit_state
        ORDER BY updated_at DESC LIMIT 1`,
    ),
    // lifecycle_playbooks
    query(
      `SELECT id, playbook_key AS playbookKey, version, trigger_event AS triggerEvent,
              state_graph AS stateGraph, status, created_at AS createdAt
         FROM lifecycle_playbooks
        WHERE status IN ('ACTIVE','DRAFT')
        ORDER BY created_at DESC LIMIT 20`,
    ),
    // academic_regulations (cloned drafts)
    query(
      `SELECT code, program_code AS programCode, effective_from AS effectiveFrom,
              is_active AS isActive, effective_to_year AS effectiveToYear, status, version, description
         FROM academic_regulations
        WHERE is_active = TRUE
        ORDER BY code LIMIT 50`,
    ),
    // academic_policy_rules (steward drafts)
    query(
      `SELECT id, regulation_code AS regulationCode, policy_category AS policyCategory,
              sub_category AS subCategory, rule_expression AS ruleExpression,
              rule_metadata AS ruleMetadata, created_at AS createdAt
         FROM academic_policy_rules
        ORDER BY created_at DESC LIMIT 50`,
    ),
  ]);

  const outboxMap: Record<string, number> = {};
  for (const row of outboxCounts.rows) {
    outboxMap[row.status as string] = Number(row.count);
  }

  // Count dedup hits (same idempotency_key appearing more than once)
  const dedupCount = dedupHits.rows.filter(
    (r: any, i: number, arr: any[]) =>
      arr.findIndex((x) => x.entityRef === r.entityRef) !== i,
  ).length;

  // Count verified UTR (sbi_collect_payment / upi_payment in processed_events)
  const verifiedUtrCount = dedupHits.rows.filter(
    (r: any) => r.eventType === "sbi_collect_payment" || r.eventType === "upi_payment",
  ).length;

  // KPI snapshot
  const kpi = {
    pendingDelegateActivations: pendingDelegates.rows.length,
    activeDelegates: activeDelegates.rows.length,
    draftsAwaitingPrincipal:
      academicRegs.rows.filter((r: any) => r.status === "DRAFT").length +
      policyRules.rows.filter((r: any) => r.ruleMetadata?.status === "DRAFT").length,
    circulars: circulars.rows.length,
    activeCirculars: circulars.rows.filter((r: any) => r.status === "PUBLISHED").length,
    recalledCirculars: circulars.rows.filter((r: any) => r.status === "RECALLED").length,
    pendingFeeItems: feeItems.rows.length,
    verifiedUtrCount,
    dedupHits: dedupCount,
    outbox: outboxMap,
    dlqCount: outboxMap["DEAD_LETTER"] ?? 0,
    llmCircuit: llmCircuit.rows[0] ?? null,
    retentionPolicies: retentionPolicies.rows.length,
  };

  return ok({
    kpi,
    pendingDelegates: pendingDelegates.rows,
    activeDelegates: activeDelegates.rows,
    routingPolicies: routingPolicies.rows,
    circulars: circulars.rows,
    announcements: announcements.rows,
    feeItems: feeItems.rows,
    paymentReferences: paymentRefs.rows,
    dedupHits: dedupHits.rows,
    retentionPolicies: retentionPolicies.rows,
    outbox: {
      counts: outboxMap,
      dlq: outboxDlq.rows,
    },
    llmCircuit: llmCircuit.rows[0] ?? null,
    lifecyclePlaybooks: lifecyclePlaybooks.rows,
    academicRegulations: academicRegs.rows,
    policyRules: policyRules.rows,
    generatedAt: now,
  });
}, { requiredRole: ["admin"] });
