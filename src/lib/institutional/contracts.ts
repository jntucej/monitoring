// src/lib/institutional/contracts.ts
//
// PR-01 — Institutional Architecture Foundation.
//
// The shared vocabulary every later engine (cases, workflows, authority,
// escalation, decisions, delegation, impact, audit) imports instead of
// inventing its own structures. Pure type + constant module: no DB access,
// no side effects, no runtime logic beyond enum-like constant arrays.
//
// Conventions (institutional, not app-specific):
//   - IDs are uuid strings (correlation ids may be human keys like
//     "DEC-2026-0421" — stored separately, not in the id field).
//   - Every consequential record carries actor + role + role_context +
//     authority_source. `principal` is ONE user; `chief_warden` and
//     `chief_superintendent` are ROLE CONTEXTS that user can act under,
//     never separate identities.
//   - Risk/impact levels are ordered (LOW < MEDIUM < HIGH < CRITICAL) so
//     comparators can escalate on increase, not equality.

// ── Roles & contexts ───────────────────────────────────────────────────────

/** The principal is a single person (one user in the institution). */
export const PRINCIPAL_ROLE = "principal" as const;

/**
 * A role context: the institutional hat the same user acts under.
 * The same principal user operates as chief_warden for hostel/warden
 * matters and as chief_superintendent for examinations. Contexts are NOT
 * roles — a context never grants authority by itself; it scopes which
 * authority policies apply.
 */
export type RoleContext =
  | "administrative"
  | "chief_warden"
  | "chief_superintendent"
  | "academic"
  | "examinations"
  | "security"
  | "emergency_command";

export const ROLE_CONTEXTS: RoleContext[] = [
  "administrative",
  "chief_warden",
  "chief_superintendent",
  "academic",
  "examinations",
  "security",
  "emergency_command",
];

/** A bounded authority grant: a principal (or any grantor) delegates to a recipient. */
export interface RoleContextGrant {
  /** uuid of the user acting. */
  actorId: string;
  role: string;
  context: RoleContext;
}

// ── Case types & lifecycle ────────────────────────────────────────────────

/** The domain every case originates from. Mirrors LADDER domains (escalation-ladder.ts). */
export type CaseType =
  | "gate_pass"
  | "hostel_leave"
  | "hostel_discipline"
  | "academic_status"
  | "exam_integrity"
  | "complaint"
  | "security_incident"
  | "emergency"
  | "delegation"
  | "mess"
  | "medical";

export const CASE_TYPES: CaseType[] = [
  "gate_pass",
  "hostel_leave",
  "hostel_discipline",
  "academic_status",
  "exam_integrity",
  "complaint",
  "security_incident",
  "emergency",
  "delegation",
  "mess",
  "medical",
];

/** Universal case lifecycle. Terminal states: RESOLVED, CLOSED, CANCELLED. */
export type CaseState = "CREATED" | "OPEN" | "RESOLVED" | "CLOSED" | "CANCELLED";

export const CASE_STATES: CaseState[] = ["CREATED", "OPEN", "RESOLVED", "CLOSED", "CANCELLED"];

export const TERMINAL_CASE_STATES: readonly CaseState[] = ["RESOLVED", "CLOSED", "CANCELLED"];

export function isTerminalCaseState(state: CaseState): boolean {
  return TERMINAL_CASE_STATES.includes(state);
}

// ── Workflow engine ────────────────────────────────────────────────────────

/** Lifecycle of a workflow instance, independent of the case's own state. */
export type WorkflowState =
  | "submitted"
  | "manager_review"
  | "deputy_review"
  | "principal_review"
  | "approved"
  | "rejected"
  | "expired";

export const WORKFLOW_STATES: WorkflowState[] = [
  "submitted",
  "manager_review",
  "deputy_review",
  "principal_review",
  "approved",
  "rejected",
  "expired",
];

/** A configurable workflow definition (PR-03 stores these in workflow_definitions). */
export interface WorkflowDefinition {
  /** stable key, e.g. "hostel_leave". */
  code: string;
  name: string;
  /** Ordered states the instance walks through. */
  states: WorkflowState[];
  /** state -> actions that may be taken while in that state. */
  transitions: Record<string, string[]>;
  /** Which role may take each transition (empty = engine authority check decides). */
  transitionRoles?: Record<string, string[]>;
}

// ── Authority engine ──────────────────────────────────────────────────────

/** The bounded scope an authority check runs inside. */
export type AuthorityScope =
  | "institution"
  | "department"
  | "program"
  | "hostel_block"
  | "exam_desk"
  | "mess"
  | "gate"
  | "security"
  | "campus_wide";

export const AUTHORITY_SCOPES: AuthorityScope[] = [
  "institution",
  "department",
  "program",
  "hostel_block",
  "exam_desk",
  "mess",
  "gate",
  "security",
  "campus_wide",
];

/** Standardized operations the decision engine executes (PR-06). */
export type StandardOperation =
  | "approve"
  | "reject"
  | "revoke"
  | "suspend"
  | "debar"
  | "override"
  | "escalate"
  | "delegate"
  | "lockdown"
  | "route_manager"
  | "route_deputy"
  | "route_principal";

export const STANDARD_OPERATIONS: StandardOperation[] = [
  "approve",
  "reject",
  "revoke",
  "suspend",
  "debar",
  "override",
  "escalate",
  "delegate",
  "lockdown",
  "route_manager",
  "route_deputy",
  "route_principal",
];

/**
 * Who YOU ARE is separated from WHAT YOU MAY DO.
 * `actor` is the user; the rest describes the bounded grant under which
 * THIS action runs. authority_source records where the authority came from:
 * direct role authority, an active delegation, or an emergency override.
 */
export interface AuthorityRequest {
  /** uuid of the user acting. */
  actorId: string;
  role: string;
  context: RoleContext;
  /** Which operation (approve / debar / ...) is being requested. */
  operation: StandardOperation;
  /** Which domain (gate_pass / hostel_leave / ...) the action touches. */
  caseType: CaseType;
  /** Bounded scope; NULL-equivalent = campus_wide. */
  scope: AuthorityScope;
  scopeCode?: string | null;
  /** Where this authority came from: the role itself or a delegation grant. */
  authoritySource: "role" | "delegation" | "emergency_override";
  /** Set when authoritySource === "delegation": the grant id. */
  delegationId?: string;
}

/** The engine's verdict. Never trust the caller's role alone. */
export interface AuthorityDecision {
  allowed: boolean;
  /** The specific rule that decided (human-readable, for audit + UI). */
  rule: string;
  /** Why it was refused when !allowed. */
  reason?: string;
  /** Bounding conditions applied (e.g. "max_duration_days": 3). */
  bounds?: Record<string, unknown>;
  /** Set when the authority was satisfied via an active delegation. */
  delegationId?: string;
  /** Where the authority came from (mirrors the request's source). */
  authoritySource?: "role" | "delegation" | "emergency_override";
}

// ── Escalation & SLA ──────────────────────────────────────────────────────

/** Why a case moves upward. Stored on escalations — the principal sees WHY. */
export type EscalationReason =
  | "SLA_BREACH"
  | "RISK_INCREASE"
  | "AUTHORITY_INSUFFICIENT"
  | "HIGH_IMPACT"
  | "REPEATED_REJECTION"
  | "CROSS_DOMAIN"
  | "MANUAL"
  | "EMERGENCY"
  | "POLICY_REQUIRED"
  | "CONFLICT_OF_INTEREST";

export const ESCALATION_REASONS: EscalationReason[] = [
  "SLA_BREACH",
  "RISK_INCREASE",
  "AUTHORITY_INSUFFICIENT",
  "HIGH_IMPACT",
  "REPEATED_REJECTION",
  "CROSS_DOMAIN",
  "MANUAL",
  "EMERGENCY",
  "POLICY_REQUIRED",
  "CONFLICT_OF_INTEREST",
];

// ── Risk & impact ──────────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RISK_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const RISK_RANK: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/** True when `level` is at least `threshold` (ordered comparator). */
export function riskAtLeast(level: RiskLevel, threshold: RiskLevel): boolean {
  return RISK_RANK[level] >= RISK_RANK[threshold];
}

/** Impact preview row: one downstream system a decision will touch (PR-08). */
export interface ImpactEntry {
  system: string;
  effect: string;
  /** Count of concrete objects affected when known. */
  affectedCount?: number | null;
}

// ── Decisions ─────────────────────────────────────────────────────────────

/** What a decision object records. Execution of approve/reject/... goes through this. */
export type DecisionType =
  | "approve"
  | "reject"
  | "revoke"
  | "suspend"
  | "debar"
  | "override"
  | "escalate"
  | "delegate"
  | "lockdown"
  | "route_manager"
  | "route_deputy"
  | "route_principal";

export const DECISION_TYPES: DecisionType[] = [...STANDARD_OPERATIONS];

/** The durable record every consequential action produces (PR-06). */
export interface DecisionRecord {
  /** Human key, e.g. "DEC-2026-0421". */
  decisionId: string;
  caseId: string;
  actorId: string;
  actorRole: string;
  roleContext: RoleContext;
  authoritySource: "role" | "delegation" | "emergency_override";
  decision: DecisionType;
  reason: string;
  /** Structured evidence (case refs, documents, recommendations). */
  evidence?: Record<string, unknown>;
  /** Downstream effects, computed BEFORE execution (PR-08 impact preview). */
  impact?: ImpactEntry[];
  timestamp: string;
  /** uuid of the audit event correlated to this decision. */
  correlationId?: string;
}

// ── Audit (PR-11 hardened shape) ──────────────────────────────────────────

/**
 * Every important event becomes a structured record. This is the shape the
 * audit ledger persists — reconstruct "why did this happen" from one row.
 */
export interface AuditEvent {
  /** Human key, e.g. "AUDIT-18273". */
  auditId: string;
  actorId: string;
  actorName?: string;
  role: string;
  roleContext: RoleContext;
  authoritySource: "role" | "delegation" | "emergency_override" | "system";
  action: string;
  /** Domain + entity, e.g. "hostel_leave / HOSTEL-2026-091". */
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** The decision this event executed, when applicable. */
  decisionId?: string;
  /** Evidence attached to the decision. */
  evidence?: Record<string, unknown>;
  /** Downstream impact summary. */
  impact?: ImpactEntry[];
  timestamp: string;
  /** Links every step of one chain (case → decision → impact → audit). */
  correlationId: string;
}

// ── Emergency subsystem ───────────────────────────────────────────────────

export type EmergencyState = "NORMAL" | "ELEVATED" | "CRITICAL" | "EMERGENCY" | "LOCKDOWN";

export const EMERGENCY_STATES: EmergencyState[] = [
  "NORMAL",
  "ELEVATED",
  "CRITICAL",
  "EMERGENCY",
  "LOCKDOWN",
];

export const EMERGENCY_RANK: Record<EmergencyState, number> = {
  NORMAL: 0,
  ELEVATED: 1,
  CRITICAL: 2,
  EMERGENCY: 3,
  LOCKDOWN: 4,
};

// ── Executive attention ───────────────────────────────────────────────────

export type AttentionSeverity = "INFO" | "WARNING" | "CRITICAL";

export const ATTENTION_SEVERITIES: AttentionSeverity[] = ["INFO", "WARNING", "CRITICAL"];

/**
 * One item the Executive Attention Engine (PR-09) produces for the
 * principal. Compressed, not raw: "what needs a decision + why".
 */
export interface AttentionItem {
  severity: AttentionSeverity;
  /** Short title, e.g. "Gate anomaly at Gate 2". */
  title: string;
  /** The compressed detail (counts, baseline deltas, deadlines). */
  detail: string;
  /** Which capability the principal opens next (case, decision, command). */
  link?: { kind: "case" | "decision" | "escalation" | "command"; id: string };
  /** The recommended action the system proposes. */
  recommendedAction?: string;
  /** When this item stops mattering (SLA / expiry / resolution). */
  expiresAt?: string | null;
}

// ── Actor (shared identity shape) ─────────────────────────────────────────

/**
 * The minimal identity every engine takes. `roleContext` is the hat the user
 * is acting under for THIS action — one user may act in several contexts
 * across different actions; each consequential record pins exactly one.
 */
export interface Actor {
  id: string;
  name?: string;
  role: string;
  roleContext: RoleContext;
}

export function makeActor(
  id: string,
  role: string,
  roleContext: RoleContext = "administrative",
  name?: string,
): Actor {
  return { id, role, roleContext, name };
}
