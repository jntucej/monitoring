/**
 * Principal Experience — shared interaction contracts (PR-02).
 *
 * These are THIN adapters + lifecycle types over the inspection model that
 * already exists (EntityInspection / InspectionSection in
 * @/components/shared/EntityInspector). Nothing here re-defines domain
 * records: entity identity and relationships must come from real API data.
 *
 * Design rules (see docs/principal/architecture.md):
 *  - No new framework, no duplicate domain models, no second global store.
 *  - Entity identity from verified records only (never string-parsed).
 *  - Unknown entity kinds fail safe (handled by the inspector, not thrown).
 *  - The server is the authority for permission + action outcome; these
 *    types describe presentation + client execution state only.
 */

import type { EntityInspection, InspectionSection } from "@/components/shared/EntityInspector";
export type { EntityInspection, InspectionSection } from "@/components/shared/EntityInspector";

/* ── Entity identity (verified, closed set) ─────────────────────────────── */

/**
 * Entity kinds the Principal experience can inspect. This is a *registry*:
 * a kind only appears here when a real backend representation + registered
 * inspection behaviour exist. Extend deliberately, not by string-parsing.
 */
export type PrincipalEntityType =
  | "student"
  | "faculty"
  | "staff"
  | "department"
  | "hostel"
  | "gate"
  | "incident"
  | "complaint"
  | "permission"
  | "approval"
  | "delegation"
  | "examination_case"
  | "institutional_case";

/** A reference to an inspectable entity. `id` is a real record identifier. */
export interface PrincipalEntityRef {
  type: PrincipalEntityType;
  id: string;
  /** Human label for the entity (from a real record, not derived). */
  label: string;
}

/**
 * The inspection target + where to return after closing. `returnTo` is the
 * origin context (a route or a named workspace) so closing the inspector
 * restores the original workspace (PR-03).
 */
export interface PrincipalEntityContext {
  entity: PrincipalEntityRef;
  returnTo?: string;
}

/**
 * Build an EntityInspection from a PrincipalEntityContext. Adapters for each
 * kind live in their domain modules; this keeps the inspector contract
 * stable while content differs per entity.
 */
export type EntityInspectionBuilder = (
  ctx: PrincipalEntityContext,
) => EntityInspection | null;

/* ── Relationships ────────────────────────────────────────────────────── */

/** A verified relationship to another entity. Missing/inaccessible is a
 *  first-class value (`available: false`) — never an invented edge. */
export interface PrincipalRelationship {
  relation: string;
  target: PrincipalEntityRef;
  /** Short status of the target (e.g. "OPEN", "ESCALATED"), when known. */
  status?: string;
  /** When the target record is not accessible to this user. */
  available?: boolean;
  unavailableReason?: string;
}

/* ── Timeline ──────────────────────────────────────────────────────────── */

/**
 * One timeline event. Distinguishes entity-activity (history of one record)
 * from the institutional live stream (new events across the institution) —
 * they share presentation but are different data sources.
 */
export interface PrincipalTimelineEvent {
  id: string;
  /** What happened (e.g. "escalated", "approved", "status changed"). */
  type: string;
  at: string; // ISO timestamp
  /** Who performed it (actor label + optional role). */
  actor?: { label: string; role?: string };
  /** State transition, if the backend records it. */
  fromState?: string;
  toState?: string;
  reason?: string;
  /** Related entity (if the event is about another record). */
  related?: PrincipalEntityRef;
  /** Evidence / audit reference (only when the backend actually stores it). */
  auditRef?: string;
  /** Distinction between the two timeline sources. */
  scope?: "entity" | "institutional";
}

/* ── Actions ───────────────────────────────────────────────────────────── */

/**
 * An available action on an entity. Presentation only — the SERVER remains the
 * authority for whether the caller may actually perform it (never infer from a
 * visible button). `available` reflects the client's best-known permission
 * state; the request still goes to the authoritative route.
 */
export interface PrincipalActionDefinition {
  id: string;
  label: string;
  description?: string;
  entityType: PrincipalEntityType | "*";
  /** Does performing it need an explicit confirmation step? */
  confirmationRequired: boolean;
  /** Free-text reason required on submit, when the workflow demands it. */
  requiresReason?: boolean;
  /** Is a downstream co-sign / second approval needed? */
  requiresSecondApproval?: boolean;
  /** Can the action be undone? */
  reversible?: boolean;
  /** Best-known client-side availability (server is final authority). */
  available?: boolean;
  unavailableReason?: string;
}

/* ── Execution state (the action lifecycle, PR-10) ───────────────────── */

/**
 * Client-side execution lifecycle for a consequential action. The terminal
 * states are determined by the SERVER response — a failed request is not the
 * same as an unknown outcome (the server may have processed it).
 */
export type PrincipalExecutionState =
  | "idle"
  | "validating"
  | "confirmation"
  | "submitting"
  | "processing"
  | "completed"
  | "failed"
  | "partial"
  | "unknown"
  | "revalidating";

/** Result payload after an action attempt (fed into PR-11 feedback). */
export interface PrincipalActionResult {
  state: PrincipalExecutionState;
  /** Per-item outcomes for batch operations (partial success is explicit). */
  itemOutcomes?: Array<{ id: string; state: PrincipalExecutionState; detail?: string }>;
  /** Authoritative confirmation that the audit record exists (not assumed). */
  auditConfirmed?: boolean;
  /** Link to the resulting/affected record, when available. */
  resultHref?: string;
}

/* ── Workspace context (PR-03) ────────────────────────────────────────── */

/**
 * Shareable workspace context. Only state that should survive refresh /
 * be shareable / be navigable goes in the URL (route + query); transient
 * presentation stays local. This shape is what a URL-sync layer reads/writes.
 */
export interface PrincipalWorkspaceContext {
  /** The active top-level workspace (e.g. "approvals", "cases", "operations"). */
  workspace: string;
  /** A filter/search within the workspace, when it should be shareable. */
  filter?: string;
  /** The entity currently being inspected (deep-linkable). */
  inspect?: PrincipalEntityContext;
  /** Origin to return to when the inspector closes. */
  returnTo?: string;
}
