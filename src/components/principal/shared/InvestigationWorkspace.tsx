"use client";

/**
 * InvestigationWorkspace — PR-08. Assembles an entity's real data into the
 * unified inspector's `EntityInspection` so it can be opened with progressive
 * disclosure WITHOUT the caller re-inventing the inspector.
 *
 * This is a *composer*, not a new inspector: it delegates presentation to the
 * verified building blocks —
 *   - createInspectorSections() (PR-04) for overview/status/relationships/actions
 *   - EntityTimeline (PR-06) for recorded history
 *   - relationshipResolver (PR-07) for verified related records
 * and hands the result to the existing EntityInspector drawer.
 *
 * Data-integrity rule (protocol §12.3): it renders only what the caller passes
 * (real fetched data). An empty/failed source shows the honest empty/error
 * state, never fabricated content.
 */
import type {
  PrincipalEntityRef,
  PrincipalRelationship,
  PrincipalTimelineEvent,
  PrincipalActionDefinition,
} from "@/lib/principal/contracts";
import type { EntityInspection } from "@/components/shared/EntityInspector";
import { createInspectorSections } from "@/components/principal/shared/inspectorSections";

export interface InvestigationWorkspaceInput {
  /** The entity being investigated (real record). */
  entity: PrincipalEntityRef;
  /** One-line state descriptor ("OPEN", "ESCALATED", "RESOLVED", ...). */
  status?: string | null;
  /** Overview key/value pairs (real fields only). */
  overview?: Array<{ label: string; value: React.ReactNode }>;
  /** Verified relationships (from relationshipResolver or a real API). */
  relationships?: PrincipalRelationship[];
  /** Recorded history (from the audit timeline mapper; empty = none stored). */
  timeline?: PrincipalTimelineEvent[];
  timelineLoading?: boolean;
  timelineError?: string | null;
  /** Available actions (presentation only — the server is the authority). */
  actions?: PrincipalActionDefinition[];
  /** How to open a related entity (inspect-without-losing-origin). */
  onInspectRelated?: (ref: PrincipalEntityRef, relation: string) => void;
  /** How to run an action (must route through the authorized workflow). */
  onAction?: (action: PrincipalActionDefinition) => void;
}

/**
 * Build an EntityInspection for the given entity. Progressive disclosure is
 * preserved by the inspector: overview (0) → relationships (1) → timeline
 * (2, collapsible) → actions (3). Empty sections still render an honest
 * "no …" state so the user knows a source is empty vs. failed.
 */
export function buildInvestigationWorkspace(
  input: InvestigationWorkspaceInput,
): EntityInspection {
  const s = createInspectorSections();
  const {
    entity,
    status,
    overview = [],
    relationships = [],
    timeline = [],
    timelineLoading = false,
    timelineError = null,
    actions = [],
    onInspectRelated,
    onAction,
  } = input;

  // Relationship target: open through the unified inspector (no lost origin),
  // or render a plain label when no inspect callback is wired (honest fallback).
  const renderRelated = (r: PrincipalRelationship) =>
    onInspectRelated ? (
      <button
        type="button"
        onClick={() => onInspectRelated(r.target, r.relation)}
        disabled={r.available === false}
        className="text-action-primary underline-offset-2 hover:underline disabled:no-underline disabled:text-text-muted"
      >
        {r.relation}: {r.target.label}
      </button>
    ) : (
      <span>{r.relation}: {r.target.label}</span>
    );

  const renderAction = (a: PrincipalActionDefinition) =>
    onAction ? (
      <button
        type="button"
        onClick={() => onAction(a)}
        className="text-sm font-medium text-action-primary underline-offset-2 hover:underline"
      >
        {a.label}
        {a.confirmationRequired ? " (requires confirmation)" : ""}
      </button>
    ) : (
      <span className="text-sm text-text-muted">{a.label}</span>
    );

  return {
    kind: entity.type,
    title: entity.label,
    subtitle: entity.id,
    status: status ?? null,
    sections: [
      s.overview(overview),
      s.relationships(relationships, renderRelated),
      s.timelineSection(timeline, {
        loading: timelineLoading,
        error: timelineError,
      }),
      s.actions(actions, renderAction),
    ],
  };
}

/**
 * Convenience hook-like helper: fetches nothing itself (the caller owns data
 * fetch + RBAC via useApiResource). Given already-fetched slices, returns the
 * inspection. Kept a function (not a hook) so it's trivially unit-testable.
 */
export function investigationWorkspaceFor(
  input: InvestigationWorkspaceInput,
): EntityInspection {
  return buildInvestigationWorkspace(input);
}
