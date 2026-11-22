"use client";

/**
 * EntityTimeline — shared presentation layer for *recorded* entity history.
 *
 * PR-06 rule (protocol §6): "Do not fabricate a timeline from the current
 * record's state. Do not infer historical events if the backend does not
 * store them." This component renders ONLY events the caller passes in —
 * i.e. real recorded audit/activity data. It has no data source of its own;
 * it is pure presentation over a `PrincipalTimelineEvent[]`.
 *
 * States it owns (honestly):
 *  - loading  → a skeleton, never a fabricated entry
 *  - empty    → "No recorded history" + the reason (e.g. not yet audited)
 *  - error    → the failure, not a silent empty
 *  - long list→ paginate (load more) so histories don't degrade the page
 *
 * It does NOT sort/derive events itself: ordering + dedup are the caller's
 * responsibility (they own the source of truth). We only display.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PrincipalTimelineEvent } from "@/lib/principal/contracts";

export interface EntityTimelineProps {
  events: PrincipalTimelineEvent[];
  loading?: boolean;
  /** Terminal load-failure (API unavailable, 403, ...). Shown, not swallowed. */
  error?: string | null;
  /** How many to show before "load more" (default 10). */
  pageSize?: number;
  /**
   * Render each event. Defaults to a label + optional actor + timestamp.
   * Pass a custom renderer for richer domain events. Receives the FULL list
   * (not just the paged slice) only when you need it; by default we page.
   */
  renderEvent?: (event: PrincipalTimelineEvent) => React.ReactNode;
  /** Stable key per event (default: event.id ?? index). */
  eventKey?: (event: PrincipalTimelineEvent, index: number) => string;
  className?: string;
}

const PAGE_DEFAULT = 10;

export function EntityTimeline({
  events,
  loading = false,
  error = null,
  pageSize = PAGE_DEFAULT,
  renderEvent,
  eventKey = (e, i) => e.id ?? String(i),
  className,
}: EntityTimelineProps) {
  const [visible, setVisible] = useState(pageSize);

  // ── Honest terminal states first (never fake an entry) ─────────────────
  if (loading && events.length === 0) {
    return (
      <div className={cn("flex flex-col gap-3", className)} aria-busy="true">
        <div className="h-2 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-2 w-4/5 animate-pulse rounded bg-surface-2" />
        <div className="h-2 w-3/5 animate-pulse rounded bg-surface-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 rounded-md border border-border p-3 text-xs",
          "bg-surface-1 text-text-secondary",
          className,
        )}
        role="alert"
      >
        <span className="font-medium text-action-danger">
          Could not load history
        </span>
        <span>{error}</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 rounded-md border border-dashed border-border p-4 text-center",
          "text-xs text-text-muted",
          className,
        )}
      >
        <span className="font-medium text-text-secondary">
          No recorded history
        </span>
        <span>
          {events.length === 0
            ? "This record has no stored events yet — history is not fabricated."
            : ""}
        </span>
      </div>
    );
  }

  // ── Recorded events: display only the paged slice; "load more" for the rest ─
  const shown = events.slice(0, visible);
  const defaultRender = (e: PrincipalTimelineEvent) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-text-primary">{e.type}</span>
      {e.actor ? (
        <span className="text-xs text-text-muted">
          by {e.actor.label}
          {e.actor.role ? ` · ${e.actor.role}` : ""}
        </span>
      ) : null}
      {e.at ? (
        <span className="text-xs text-text-muted">
          {formatTimestamp(e.at)}
        </span>
      ) : null}
      {e.fromState || e.toState ? (
        <span className="text-xs text-text-muted">
          {e.fromState ?? "—"} → {e.toState ?? "—"}
        </span>
      ) : null}
      {e.reason ? (
        <span className="text-xs text-text-muted">{e.reason}</span>
      ) : null}
      {e.auditRef ? (
        <span className="text-[11px] font-mono text-text-muted">
          ref {e.auditRef}
        </span>
      ) : null}
    </div>
  );
  const renderer = renderEvent ?? defaultRender;

  return (
    <div className={cn("flex flex-col", className)}>
      <ol className="relative flex flex-col gap-4 pl-4 before:absolute before:left-1 before:top-1 before:h-[calc(100%-0.5rem)] before:w-px before:bg-border">
        {shown.map((e, i) => (
          <li key={eventKey(e, i)} className="relative">
            {/* node */}
            <span
              className={cn(
                "absolute -left-[15px] top-1 size-2.5 rounded-full border-2",
                "bg-bg-surface",
                i === 0 ? "border-action-primary" : "border-border",
              )}
              aria-hidden="true"
            />
            {renderer(e)}
          </li>
        ))}
      </ol>
      {events.length > visible ? (
        <button
          type="button"
          onClick={() => setVisible((v) => v + pageSize)}
          className="mt-3 self-start rounded text-xs font-medium text-action-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        >
          Load {Math.min(pageSize, events.length - visible)} more
          <span className="text-text-muted">
            {" "}
            ({events.length - visible} remaining)
          </span>
        </button>
      ) : null}
    </div>
  );
}

function formatTimestamp(at: string): string {
  try {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return at;
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return at;
  }
}

export default EntityTimeline;
