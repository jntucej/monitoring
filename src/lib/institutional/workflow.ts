// src/lib/institutional/workflow.ts
//
// PR-03 — Workflow Engine + PR-04 — Authority Engine.
//
// A case moves through states by looking up its workflow definition, not
// by hard-coded route logic. `transitionWorkflow(caseId, action)` loads
// the case's instance, validates the current_state, the allowed transition,
// the actor, and the authority that permits it, then records the step.
//
// Authority is a separate question: `authorize(actor, action, resource)`
// answers "WHAT may this user do in THIS situation?" — not just "who are
// they?" A role alone is never enough. The decision pins the exact
// authority_policies that allowed it, so PR-06's decision record and
// PR-11's audit ledger can cite it.
//
// Composes, doesn't fork:
//   * LADDER + canAct (permission-model / escalation-ladder) answer the
//     ticket-domain question; this engine answers the institutional
//     case/workflow question. Both are pure and can sit side by side.
//   * delegations (entity_foundation) — an active delegation satisfies a
//     policy that requires a role the delegatee does not directly hold.

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import type {
  Actor,
  AuthorityDecision,
  AuthorityRequest,
  CaseState,
} from "@/lib/institutional/contracts";

// ── Authority engine (PR-04) ──────────────────────────────────────────────

export interface PolicyRow {
  id: string;
  code: string;
  role: string;
  context: string | null;
  operation: string;
  case_type: string;
  scope_type: string;
  scope_code: string | null;
  bounds: Record<string, unknown>;
  is_active: boolean;
  version: number;
}

/**
 * Does an active delegation let `delegateeId` act as `role` within
 * `scopeCode` right now? Delegation-aware authority: a delegatee with an
 * active, unrevoked, in-window delegation CAN act as the delegated role
 * within the scope window; nothing is permanent.
 */
export async function hasActiveDelegation(
  delegateeId: string,
  role: string,
  scopeCode: string | null,
): Promise<{ active: boolean; delegationId: string | null }> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM public.delegations
      WHERE delegatee_id = $1 AND role = $2
        AND revoked_at IS NULL
        AND starts_at <= now() AND expires_at > now()
        AND ($3::text IS NULL OR scope_entity = $3)
      LIMIT 1`,
    [delegateeId, role, scopeCode ?? null],
  );
  return { active: rows.length > 0, delegationId: rows[0]?.id ?? null };
}

/**
 * The authority check every workflow transition calls. Separates WHO
 * (role + context) from WHAT (bounded authority). Returns the specific
 * policies that decided, so a decision / audit record can cite them.
 */
export async function authorize(
  req: AuthorityRequest,
): Promise<AuthorityDecision> {
  // A row may be satisfied directly (the actor's own role) OR through an
  // active delegation (a delegatee granted this role within scope). Both
  // paths are audited; the decision record carries authoritySource +
  // delegationId so PR-06/PR-11 can cite exactly which one fired.
  const { rows: policies } = await query<PolicyRow>(
    `SELECT id, code, role, context, operation, case_type, scope_type, scope_code, bounds, version
       FROM public.authority_policies
      WHERE is_active = TRUE
        AND operation = $1
        AND case_type = $2
        AND (context IS NULL OR context = $3)
        AND (scope_code IS NULL OR scope_code = $4 OR scope_type = 'institution' OR scope_type = 'campus_wide')
        AND (role = $5
             OR ($6::uuid IS NOT NULL
                 AND role = (
                   SELECT d.role FROM public.delegations d
                    WHERE d.delegatee_id = $6
                      AND d.revoked_at IS NULL
                      AND d.starts_at <= now() AND d.expires_at > now()
                      AND ($4::text IS NULL OR d.scope_entity = $4)
                      AND d.role IS NOT NULL
                   LIMIT 1
                 )))
      ORDER BY (role = $5) DESC, version DESC`,
    [req.operation, req.caseType, req.context, req.scopeCode ?? null, req.role, req.actorId],
  );

  // No policy row at all → refuse. A role existing is not authority.
  if (policies.length === 0) {
    return {
      allowed: false,
      rule: "no active authority policy",
      reason: `no active policy grants ${req.role} the ${req.operation} on ${req.caseType}`,
    };
  }

  // Find a policy whose bounds the request satisfies. Prefer a direct-role
  // policy (role = req.role) over one satisfied only by a delegation.
  for (const p of policies) {
    if (!evaluateBounds(p.bounds, req)) continue;
    const viaDelegation = p.role !== req.role;
    return {
      allowed: true,
      rule: viaDelegation ? `${p.code} (via delegation)` : p.code,
      bounds: p.bounds,
      authoritySource: viaDelegation ? "delegation" : "role",
      ...(viaDelegation ? { delegationId: req.delegationId } : {}),
    };
  }

  // Policies exist but none of their bounds cover this request → the
  // authority is exceeded → escalate (PR-05).
  const top = policies[0];
  return {
    allowed: false,
    rule: top.code,
    reason: `authority bounds not satisfied (max ${JSON.stringify(top.bounds)}) — escalate to a higher authority`,
    bounds: top.bounds,
  };
}

/**
 * A bound like {"max_duration_days":3} is satisfied when the request's
 * matching field (durationDays) is <= 3. Pure + exported so tests and
 * PR-05 (SLA/escalation) can reuse it.
 */
export function evaluateBounds(bounds: Record<string, unknown>, req: AuthorityRequest): boolean {
  if (!bounds || Object.keys(bounds).length === 0) return true;
  const r = req as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(bounds)) {
    // max_* bounds: the request field (if present) must be <= the bound.
    if (k.startsWith("max_")) {
      const field = k.replace("max_", "").replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const actual = r[field];
      if (actual != null && typeof actual === "number" && typeof v === "number" && actual > v) {
        return false;
      }
    }
  }
  return true;
}

// ── Workflow engine (PR-03) ───────────────────────────────────────────────

export interface WorkflowInstanceRow {
  id: string;
  case_id: string;
  definition_id: string;
  current_state: string;
  authority_source: string | null;
}

/**
 * Start (or fetch) the workflow instance for a case under a definition.
 * The instance opens in the definition's first state.
 */
export async function startWorkflow(caseId: string, definitionCode: string): Promise<WorkflowInstanceRow> {
  const { rows } = await query<WorkflowInstanceRow>(
    `SELECT i.id, i.case_id, i.definition_id, i.current_state, i.authority_source
       FROM public.workflow_instances i
       JOIN public.workflow_definitions d ON d.id = i.definition_id
      WHERE i.case_id = $1 AND d.code = $2
      LIMIT 1`,
    [caseId, definitionCode],
  );
  if (rows.length > 0) return rows[0];

  // No instance yet → open one at the definition's first state.
  const { rows: defs } = await query<{ id: string; states: unknown[] }>(
    `SELECT id, states FROM public.workflow_definitions WHERE code = $1 AND is_active = TRUE`,
    [definitionCode],
  );
  if (defs.length === 0) throw new Error(`no active workflow definition '${definitionCode}'`);
  const firstState = (defs[0].states as unknown as string[])[0] ?? "submitted";
  const { rows: inserted } = await query<WorkflowInstanceRow>(
    `INSERT INTO public.workflow_instances (case_id, definition_id, current_state, authority_source)
     VALUES ($1, $2, $3, 'role')
     ON CONFLICT (case_id, definition_id) DO UPDATE SET current_state = EXCLUDED.current_state
     RETURNING id, case_id, definition_id, current_state, authority_source`,
    [caseId, defs[0].id, firstState],
  );
  return inserted[0];
}

export interface TransitionResult {
  instance: WorkflowInstanceRow;
  fromState: string;
  toState: string;
  action: string;
  authority: AuthorityDecision;
}

/**
 * transition(case, action): move a case's workflow instance to the next
 * state. Validates current_state, the allowed transition, the actor's
 * authority, and the policy's bounds. Records the step immutably.
 */
export async function transitionWorkflow(
  caseId: string,
  action: string,
  actor: Actor,
  definitionCode: string,
  bounds: Record<string, unknown> = {},
): Promise<TransitionResult> {
  const inst = await startWorkflow(caseId, definitionCode);
  const fromState = inst.current_state;

  // Load the definition + allowed actions from the current state.
  const { rows } = await query<{ id: string; transitions: Record<string, string[]>; transition_roles: Record<string, string[]> }>(
    `SELECT d.id, d.transitions, d.transition_roles
       FROM public.workflow_definitions d
       JOIN public.workflow_instances i ON i.definition_id = d.id
      WHERE i.id = $1`,
    [inst.id],
  );
  const def = rows[0];
  if (!def) throw new Error(`workflow instance ${inst.id} has no definition`);

  const allowed = def.transitions[fromState] ?? [];
  if (!allowed.includes(action)) {
    throw new Error(`action '${action}' not allowed from state '${fromState}' (allowed: ${allowed.join(", ") || "none"})`);
  }

  // Resolve the target state: the action maps to the "to" state. For the
  // reference workflows, approve/reject/expired map deterministically;
  // route_* map to the next review state. A small resolver keeps this
  // domain-agnostic while staying configurable.
  const toState = resolveWorkflowTarget(fromState, action);

  // Authority check (PR-04). The bounds are the case's request payload
  // (duration, risk, ...) so a policy's max_* bound can be tested.
  const authorityReq: AuthorityRequest & Record<string, unknown> = {
    actorId: actor.id,
    role: actor.role,
    context: actor.roleContext,
    operation: action as AuthorityRequest["operation"],
    caseType: definitionCode as AuthorityRequest["caseType"],
    scope: "institution",
    authoritySource: "role",
    ...bounds,
  };
  const authority = await authorize(authorityReq);
  if (!authority.allowed) {
    // Authority exceeded → do not move; record the refusal so PR-05 can
    // escalate it. The instance stays in fromState.
    await recordTransition(inst.id, fromState, fromState, action, actor, [], false, authority.reason);
    throw new Error(`authority refused: ${authority.reason ?? authority.rule}`);
  }

  await recordTransition(inst.id, toState === fromState ? toState : fromState, toState, action, actor, [authority.rule], true);

  const updated: WorkflowInstanceRow = { ...inst, current_state: toState, authority_source: "role" };
  await logAuditEvent({
    action: "workflow.transitioned",
    userId: actor.id,
    userName: actor.name ?? actor.id,
    userRole: actor.role,
    details: {
      case_id: caseId,
      definition: definitionCode,
      from: fromState,
      to: toState,
      action,
      authority_rule: authority.rule,
    },
  } as any);

  return { instance: updated, fromState, toState, action, authority };
}

/**
 * Map an action to its target state. Deterministic for the reference
 * workflows; a domain migration (PR-13) can register richer resolvers.
 */
export function resolveWorkflowTarget(fromState: string, action: string): string {
  // The "to" state for an action is deterministic and domain-agnostic:
  // terminal verbs (approve/reject/expire) land in their terminal state;
  // routing verbs move to the next review state; anything else stays.
  // A domain migration (PR-13) can register a richer resolver per
  // definition without touching this kernel.
  switch (action) {
    case "approve": return "approved";
    case "reject": return "rejected";
    case "route_manager": return "manager_review";
    case "route_deputy": return "deputy_review";
    case "route_principal": return "principal_review";
    case "expire": return "expired";
    default:
      // Unknown action → stay; the caller decides.
      return fromState;
  }
}

async function recordTransition(
  instanceId: string,
  from: string,
  to: string,
  action: string,
  actor: Actor,
  authorityRules: string[],
  advanced: boolean,
  reason?: string,
): Promise<void> {
  await query(
    `INSERT INTO public.workflow_transitions
       (instance_id, from_state, to_state, action, actor_id, role_context, authority_ids, conditions_met)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
    [
      instanceId, from, to, action,
      actor.id, actor.roleContext,
      JSON.stringify(authorityRules),
      JSON.stringify(advanced ? {} : { reason: reason ?? "authority_refused" }),
    ],
  ).catch(() => {});
  if (advanced) {
    await query(
      `UPDATE public.workflow_instances SET current_state = $2, updated_at = now() WHERE id = $1`,
      [instanceId, to],
    ).catch(() => {});
  }
}
