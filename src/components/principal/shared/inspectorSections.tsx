"use client";

/**
 * PR-04 — composable inspector section builders.
 *
 * Shared, composable section builders for the unified Entity Inspector.
 * Domain inspectors (student, gate, incident, permission, …) compose these
 * instead of hand-building their own panels — shared STRUCTURE, not identical
 * CONTENT. Each builder returns an `InspectionSection` to feed the existing
 * `EntityInspector`, in the canonical order
 * overview → status → relationships → timeline → actions.
 *
 * Reuses existing presentation components (KVPairs, StatusBadge) and the
 * host's own render helpers. Unknown / missing data renders an honest empty
 * state — never invented relationships, events, or audit refs.
 */

import type { ReactNode } from "react";
import { KVPairs } from "@/components/shared/EntityInspector";
import type { InspectionSection } from "@/components/shared/EntityInspector";
import { EntityTimeline } from "@/components/principal/shared/EntityTimeline";
import type {
  PrincipalRelationship,
  PrincipalTimelineEvent,
  PrincipalActionDefinition,
} from "@/lib/principal/contracts";

/* Canonical section titles — one source of truth for inspection order. */
export const INSPECTOR_SECTION_TITLES = {
  overview: "Overview",
  status: "Current status",
  relationships: "Connected records",
  timeline: "Timeline",
  actions: "Actions",
} as const;

/* Honest empty state — no data, no fabricated content. */
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-text-muted">{text}</p>;
}

export interface InspectorSections {
  /** Overview — key/value summary (first, always-shown section). */
  overview: (pairs: Array<{ label: string; value: ReactNode }>) => InspectionSection;
  /** Status / current state (free content from the domain). */
  status: (content: ReactNode) => InspectionSection;
  /**
   * Relationships from verified data. `renderTarget` is the host's link/inspect
   * helper. Missing or inaccessible records (available=false) are shown
   * honestly, never omitted into a fabricated graph.
   */
  relationships: (
    rels: PrincipalRelationship[],
    renderTarget: (r: PrincipalRelationship) => ReactNode,
  ) => InspectionSection;
  /**
   * Timeline (entity-activity or institutional stream — host distinguishes via
   * event.scope). Collapsible by default (may be long). Empty = "no recorded
   * history", never an inferred timeline.
   */
  timeline: (
    events: PrincipalTimelineEvent[],
    renderEvent: (e: PrincipalTimelineEvent) => ReactNode,
    opts?: { collapsible?: boolean },
  ) => InspectionSection;
  /** Actions (presentation only; the SERVER is the authority for each). */
  actions: (
    actions: PrincipalActionDefinition[],
    renderAction: (a: PrincipalActionDefinition) => ReactNode,
  ) => InspectionSection;
  /**
   * PR-06: a timeline section rendered by the shared EntityTimeline — carries
   * honest loading / empty / error states + pagination for long histories.
   * Use this (not the custom `timeline` renderer) when the events are real
   * recorded data (e.g. audit logs) and you want the standard presentation.
   */
  timelineSection: (
    events: PrincipalTimelineEvent[],
    opts?: { loading?: boolean; error?: string | null; pageSize?: number },
  ) => InspectionSection;
}

export function createInspectorSections(): InspectorSections {
  return {
    overview: (pairs) => ({
      title: INSPECTOR_SECTION_TITLES.overview,
      content: pairs.length ? <KVPairs items={pairs} /> : <Empty text="No overview data" />,
    }),
    status: (content) => ({
      title: INSPECTOR_SECTION_TITLES.status,
      content,
    }),
    relationships: (rels, renderTarget) => ({
      title: INSPECTOR_SECTION_TITLES.relationships,
      content:
        rels.length === 0 ? (
          <Empty text="No connected records" />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rels.map((r) => (
              <li key={r.target.id + r.relation} className="text-sm">
                {r.available === false ? (
                  <span className="text-text-muted">
                    {r.relation}: {r.unavailableReason ?? "unavailable"}
                  </span>
                ) : (
                  renderTarget(r)
                )}
              </li>
            ))}
          </ul>
        ),
    }),
    timeline: (events, renderEvent, opts = {}) => ({
      title: INSPECTOR_SECTION_TITLES.timeline,
      collapsible: opts.collapsible ?? true,
      content:
        events.length === 0 ? (
          <Empty text="No recorded history" />
        ) : (
          <div className="flex flex-col gap-2">{events.map(renderEvent)}</div>
        ),
    }),
    actions: (actions, renderAction) => ({
      title: INSPECTOR_SECTION_TITLES.actions,
      content:
        actions.length === 0 ? (
          <Empty text="No available actions" />
        ) : (
          <div className="flex flex-col gap-2">{actions.map(renderAction)}</div>
        ),
    }),
    timelineSection: (events, opts = {}) => ({
      title: INSPECTOR_SECTION_TITLES.timeline,
      collapsible: true,
      content: (
        <EntityTimeline
          events={events}
          loading={opts.loading}
          error={opts.error}
          pageSize={opts.pageSize}
        />
      ),
    }),
  };
}
