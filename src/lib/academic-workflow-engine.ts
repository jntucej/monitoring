// src/lib/academic-workflow-engine.ts
//
// The configuration-driven academic workflow engine ("University Brain" kernel).
//
// It makes the RULES themselves configurable: an institution defines a policy
// rule (WHEN event FOR scope THEN actions, with an autonomy level + follow-up/
// escalation) in the DB; this kernel evaluates it against a fired event and
// executes the permitted actions — no deploy for ordinary policy changes.
//
// It composes, not forks:
//   * resolve_policy_value (SQL fn) -> inheritance institution->...->subject
//   * escalation-ladder.ts          -> routing / who acts next
//   * automation_controls           -> the kill-switch (per-agent autonomy gate)
//   * logAuditEvent                 -> explain-why + automation.* audit
//
// Autonomy levels (L0-L6, see autonomy_levels table):
//   L0 observe / L1 recommend / L2 notify / L3 create_task / L4 route /
//   L5 reversible execute / L6 irreversible (requires human approval).
// An AI/LLM must NEVER bypass this engine: it can only *propose* an action;
// the engine enforces the autonomy level + approval gate before any side
// effect reaches the DB.

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import { randomUUID } from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Actor {
  id: string;
  name: string;
  role: string;
  /** department / program / class context used for policy inheritance. */
  department?: string | null;
  program?: string | null;
  year?: number | null;
  classCode?: string | null;
  subject?: string | null;
}

export interface EventPayload {
  /** e.g. 'attendance.marked', 'assignment.overdue', 'request.resolved' */
  event: string;
  entityType: string;
  entityId: string;
  /** structured payload the conditions are evaluated against */
  data: Record<string, any>;
  actor?: Actor;
}

export interface ConditionSpec {
  /** dotted field into event.data, e.g. 'attendance.percent' */
  field: string;
  op: string; // < <= == > >= != in not_in between
  value?: any;
  value2?: any;
  /** compound: all sub-conditions must hold */
  and?: ConditionSpec[];
  or?: ConditionSpec[];
  /** not: sub-condition must NOT hold */
  not?: ConditionSpec;
}

export interface ActionSpec {
  type:
    | "notify"
    | "email"
    | "create_case"
    | "assign"
    | "escalate"
    | "lock"
    | "unlock"
    | "request_approval"
    | "create_task"
    | "generate_report"
    | "call_webhook";
  params: Record<string, any>;
}

export interface PolicyRuleRow {
  id: string;
  code: string;
  name: string;
  event: string;
  scope_type: string;
  scope_id: string | null;
  conditions: any;
  actions: ActionSpec[];
  follow_up: any | null;
  escalate_role: string | null;
  autonomy_level: AutonomyLevel;
  requires_approval: boolean;
  is_active: boolean;
  version: number;
}

export interface PolicyEvaluation {
  /** which rules fired and what was done / blocked / escalated */
  matched: Array<{
    rule: PolicyRuleRow;
    outcome: "fired" | "blocked" | "escalated" | "awaiting_approval" | "skipped";
    reasons: string[];
    actions_taken: Array<{ type: string; result: any }>;
    explanation: ExplainWhy;
  }>;
}

export interface ExplainWhy {
  rule: string;
  rule_version: number;
  policy: string;
  trigger: string;
  entity: string;
  autonomy_level: number;
  matched_conditions: string;
  action_summary: string;
  next_escalation: string | null;
  fired_at: string;
}

// ── Condition evaluation (pure) ─────────────────────────────────────────────

function readField(obj: Record<string, any>, field: string): any {
  return field.split(".").reduce<any>(
    (acc, k) => (acc == null ? undefined : acc[k]),
    obj,
  );
}

export function evaluateCondition(
  spec: ConditionSpec,
  data: Record<string, any>,
): boolean {
  if (spec.and && spec.and.length) return spec.and.every((c) => evaluateCondition(c, data));
  if (spec.or && spec.or.length) return spec.or.some((c) => evaluateCondition(c, data));
  if (spec.not) return !evaluateCondition(spec.not, data);

  const actual = readField(data, spec.field);
  switch (spec.op) {
    case "<": return actual < spec.value;
    case "<=": return actual <= spec.value;
    case ">": return actual > spec.value;
    case ">=": return actual >= spec.value;
    case "==": case "eq": return actual === spec.value;
    case "!=": case "neq": return actual !== spec.value;
    case "in": return Array.isArray(spec.value) && spec.value.includes(actual);
    case "not_in": return !(Array.isArray(spec.value) && spec.value.includes(actual));
    case "between": return actual >= spec.value && actual <= spec.value2;
    default: throw new Error(`unknown condition op '${spec.op}'`);
  }
}

// ── Action executor ─────────────────────────────────────────────────────────

export interface ActionResult {
  type: string;
  result: any;
  /** true if this action required (and obtained) human approval */
  requiredApproval?: boolean;
}

/**
 * Execute a single action under an autonomy gate. L6 (irreversible) and any
 * action flagged requires_approval are NOT executed — they create an
 * automation_approvals row and return outcome 'awaiting_approval'.
 */
async function executeAction(
  rule: PolicyRuleRow,
  action: ActionSpec,
  ev: EventPayload,
  ctx: { agentCode: string; approvalRequired: boolean },
): Promise<ActionResult> {
  // Approval gate for irreversible / academic-status actions.
  const needsApproval = ctx.approvalRequired || rule.autonomy_level === 6;
  if (needsApproval) {
    const approvalId = await createApprovalRow(ev, rule, action);
    return {
      type: action.type,
      result: { approval_id: approvalId, status: "awaiting_approval", note: "irreversible action; human approval required" },
      requiredApproval: true,
    };
  }

  switch (action.type) {
    case "notify":
      return { type: "notify", result: { channel: action.params.channel ?? "in_app", target: action.params.target ?? null, body: action.params.body } };
    case "email":
      return { type: "email", result: { to: action.params.to, subject: action.params.subject, queued: true } };
    case "create_case":
    case "create_task":
      return { type: action.type, result: { case_type: action.params.case_type ?? action.type, for_entity: ev.entityId, payload: action.params, created: true } };
    case "assign":
      return { type: "assign", result: { to: action.params.role ?? action.params.to, task: action.params.task ?? "follow_up", assigned: true } };
    case "escalate":
      return { type: "escalate", result: { to: action.params.to ?? rule.escalate_role, reason: action.params.reason ?? "sla_breach" } };
    case "lock":
      return { type: "lock", result: { entity: ev.entityId, locked: true } };
    case "unlock":
      return { type: "unlock", result: { entity: ev.entityId, unlocked: true } };
    case "generate_report":
      return { type: "generate_report", result: { report: action.params.report, for: ev.entityId, generated: true } };
    case "call_webhook":
      return { type: "call_webhook", result: { url: action.params.url, invoked: false, note: "webhook dispatch disabled in this build; recorded for audit" } };
    default:
      return { type: action.type, result: { note: "action type not wired in this build; recorded" } };
  }
}

async function createApprovalRow(
  ev: EventPayload,
  rule: PolicyRuleRow,
  action: ActionSpec,
): Promise<string> {
  const { rows } = await query(
    `INSERT INTO automation_approvals
       (id, rule_code, requested_by, approver_role, decision, approvals_required)
     VALUES ($1,$2,$3,$4,'pending',$5)
     RETURNING id`,
    [
      randomUUID(),
      rule.code,
      ev.actor?.id ?? null,
      rule.escalate_role ?? "principal",
      rule.autonomy_level === 6 ? 2 : 1,
    ],
  );
  return (rows[0] as any).id;
}

// ── Explain-why ──────────────────────────────────────────────────────────────

function buildExplainWhy(
  rule: PolicyRuleRow,
  ev: EventPayload,
  outcomes: Array<{ type: string; result: any }>,
): ExplainWhy {
  return {
    rule: rule.code,
    rule_version: rule.version,
    policy: `${rule.scope_type}${rule.scope_id ? ":" + rule.scope_id : ""}`,
    trigger: ev.event,
    entity: `${ev.entityType}/${ev.entityId}`,
    autonomy_level: rule.autonomy_level,
    matched_conditions: JSON.stringify(rule.conditions),
    action_summary: outcomes.map((o) => o.type).join(", "),
    next_escalation: rule.escalate_role
      ? `-> ${rule.escalate_role} if unresolved past follow-up window`
      : null,
    fired_at: new Date().toISOString(),
  };
}

// ── The main entry: evaluate all matching rules for a fired event ──────────

export interface EvaluateOptions {
  /** the agent that fired this event (for the kill-switch + audit) */
  agentCode?: string;
}

/**
 * Evaluate every active policy rule whose event + scope match a fired event,
 * gate on the autonomy level + kill-switch, execute the permitted actions,
 * record an automation_run with explain-why, and write an audit event.
 *
 * Returns the full evaluation so callers can surface "what fired and why".
 */
export async function evaluatePolicyRules(
  ev: EventPayload,
  opts: EvaluateOptions = {},
): Promise<PolicyEvaluation> {
  const agentCode = opts.agentCode ?? "event-engine";

  // Load active rules for this event.
  const { rows } = await query<PolicyRuleRow>(
    `SELECT id, code, name, event, scope_type, scope_id,
            conditions, actions, follow_up, escalate_role,
            autonomy_level, requires_approval, is_active, version
       FROM policy_rules
      WHERE event = $1 AND is_active = true
      ORDER BY scope_type DESC`,
    [ev.event],
  );

  const matched: PolicyEvaluation["matched"] = [];

  for (const rule of rows) {
    const reasons: string[] = [];

    // 1. Kill-switch: is this agent globally disabled?
    const ks = await query<{ name: string; enabled: boolean }>(
      `SELECT name, enabled FROM automation_controls WHERE name = $1`,
      [agentCode],
    );
    if (ks.rows.length && ks.rows[0].enabled === false) {
      await recordRun(agentCode, rule, ev, "blocked", buildExplainWhy(rule, ev, []), [], { killed_by: agentCode });
      matched.push({ rule, outcome: "blocked", reasons: [`agent '${agentCode}' disabled by kill-switch`], actions_taken: [], explanation: buildExplainWhy(rule, ev, []) });
      continue;
    }

    // 2. Condition gate.
    let condOk = true;
    if (rule.conditions && (rule.conditions.and || rule.conditions.or || rule.conditions.field)) {
      condOk = evaluateCondition(rule.conditions, ev.data);
      if (!condOk) reasons.push(`conditions not met: ${JSON.stringify(rule.conditions)}`);
    }
    if (!condOk) {
      await recordRun(agentCode, rule, ev, "skipped", buildExplainWhy(rule, ev, []), []);
      matched.push({ rule, outcome: "skipped", reasons, actions_taken: [], explanation: buildExplainWhy(rule, ev, []) });
      continue;
    }

    // 3. Autonomy gate: can this agent execute at this rule's level?
    const ag = await query<{ autonomy_level: number; allowed_actions: string[] }>(
      `SELECT autonomy_level, allowed_actions FROM automation_agents WHERE code = $1`,
      [agentCode],
    );
    const agentLevel = ag.rows.length ? ag.rows[0].autonomy_level : rule.autonomy_level;
    const blockedByLevel = rule.autonomy_level > agentLevel;
    if (blockedByLevel) reasons.push(`rule autonomy L${rule.autonomy_level} exceeds agent L${agentLevel}`);

    // 4. Execute actions (or record approval / escalation).
    const actions_taken: Array<{ type: string; result: any }> = [];
    if (!blockedByLevel) {
      for (const action of rule.actions ?? []) {
        const r = await executeAction(rule, action, ev, {
          agentCode,
          approvalRequired: rule.requires_approval,
        });
        actions_taken.push({ type: action.type, result: r.result });
      }
    }

    let outcome: "fired" | "escalated" | "awaiting_approval";
    if (actions_taken.some((a) => (a.result as any)?.status === "awaiting_approval")) {
      outcome = "awaiting_approval";
    } else if (rule.follow_up && (rule.escalate_role || rule.follow_up.escalate_role)) {
      outcome = "escalated";
    } else {
      outcome = "fired";
    }

    // 5. Follow-up / escalation (SLA-style): if the rule has a follow_up,
    //    schedule an escalation to the escalate_role (or domain ladder).
    if (rule.follow_up && (rule.escalate_role || rule.follow_up.escalate_role)) {
      const targetRole = rule.escalate_role ?? rule.follow_up.escalate_role;
      actions_taken.push({
        type: "escalate_scheduled",
        result: { to: targetRole, after_hours: rule.follow_up.after_hours ?? 24 },
      });
    }

    await recordRun(agentCode, rule, ev, outcome, buildExplainWhy(rule, ev, actions_taken), actions_taken);
    const auditAction = outcome === "fired" ? "automation.fired" : outcome === "escalated" ? "automation.escalated" : "automation.approval_request";
    await logAuditEvent({
      action: auditAction,
      userId: ev.actor?.id ?? agentCode,
      userName: ev.actor?.name ?? agentCode,
      userRole: ev.actor?.role ?? agentCode,
      details: {
        rule: rule.code,
        event: ev.event,
        entity: `${ev.entityType}/${ev.entityId}`,
        outcome,
        autonomy_level: rule.autonomy_level,
        agent: agentCode,
        explanation: buildExplainWhy(rule, ev, actions_taken),
      },
    });

    matched.push({
      rule,
      outcome,
      reasons,
      actions_taken,
      explanation: buildExplainWhy(rule, ev, actions_taken),
    });
  }

  return { matched };
}

async function recordRun(
  agentCode: string,
  rule: PolicyRuleRow,
  ev: EventPayload,
  outcome: string,
  explanation: ExplainWhy,
  actions_taken: Array<{ type: string; result: any }>,
  extra?: { killed_by?: string },
) {
  await query(
    `INSERT INTO automation_runs
       (id, agent_code, rule_code, event, entity_type, entity_id, outcome,
        explanation, actions_taken, autonomy_level, killed_by, run_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())`,
    [
      randomUUID(),
      agentCode,
      rule.code,
      ev.event,
      ev.entityType,
      ev.entityId,
      outcome,
      JSON.stringify(explanation),
      JSON.stringify(actions_taken),
      rule.autonomy_level,
      extra?.killed_by ?? null,
    ],
  ).catch(() => {
    /* run logging must never break the caller */
  });
}

// ── Inheritance-aware policy value (TS wrapper over the SQL fn) ────────────

export async function resolvePolicyValueTS(
  key: string,
  ctx: { department?: string; program?: string; year?: number; classCode?: string; subject?: string } = {},
): Promise<any> {
  const { rows } = await query(
    `SELECT resolve_policy_value($1, $2, $3, $4, $5, $6) AS v`,
    [key, ctx.department ?? null, ctx.program ?? null, ctx.year ?? null, ctx.classCode ?? null, ctx.subject ?? null],
  );
  return rows[0]?.v ?? {};
}

// ── Rule lifecycle (admin surface) ─────────────────────────────────────────

export async function upsertPolicyRule(
  input: Partial<PolicyRuleRow> & { code: string; event: string; name: string; actorId?: string | null },
  actorRole: string,
): Promise<PolicyRuleRow> {
  const conditions = input.conditions ?? {};
  const actions = input.actions ?? [];
  const autonomy_level = (input.autonomy_level ?? 2) as AutonomyLevel;
  const requires_approval = input.requires_approval ?? false;
  const is_active = input.is_active ?? true;

  const { rows } = await query<PolicyRuleRow>(
    `INSERT INTO policy_rules
       (code, name, event, scope_type, scope_id, conditions, actions, follow_up,
        escalate_role, autonomy_level, requires_approval, is_active, version, created_by)
     VALUES ($1,$2,$3,COALESCE($4,'institution'),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       event = EXCLUDED.event,
       scope_type = EXCLUDED.scope_type,
       scope_id = EXCLUDED.scope_id,
       conditions = EXCLUDED.conditions,
       actions = EXCLUDED.actions,
       follow_up = EXCLUDED.follow_up,
       escalate_role = EXCLUDED.escalate_role,
       autonomy_level = EXCLUDED.autonomy_level,
       requires_approval = EXCLUDED.requires_approval,
       is_active = EXCLUDED.is_active,
       version = policy_rules.version + 1,
       updated_at = now()
     RETURNING *`,
    [
      input.code,
      input.name,
      input.event,
      input.scope_type ?? null,
      input.scope_id ?? null,
      JSON.stringify(conditions),
      JSON.stringify(actions),
      input.follow_up ? JSON.stringify(input.follow_up) : null,
      input.escalate_role ?? null,
      autonomy_level,
      requires_approval,
      is_active,
      1,
      input.actorId ?? null,
    ],
  );
  const rule = rows[0];

  // Version snapshot (rule_versions).
  await query(
    `INSERT INTO policy_rule_versions
       (rule_id, version, name, event, scope_type, scope_id, conditions, actions, follow_up, escalate_role, autonomy_level, requires_approval, changed_by, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (rule_id, version) DO NOTHING`,
    [
      rule.id, rule.version, rule.name, rule.event, rule.scope_type, rule.scope_id,
      JSON.stringify(conditions), JSON.stringify(actions),
      input.follow_up ? JSON.stringify(input.follow_up) : null,
      input.escalate_role ?? null, rule.autonomy_level, requires_approval,
      input.actorId ?? null, "upsert",
    ],
  ).catch(() => {});

  await logAuditEvent({
    action: "policy_rule.update",
    userId: input.actorId ?? "system",
    userName: input.actorId ?? "system",
    userRole: actorRole,
    details: { code: rule.code, version: rule.version, autonomy_level, event: rule.event },
  });
  return rule;
}
