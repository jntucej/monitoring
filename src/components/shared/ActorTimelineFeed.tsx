"use client";

export interface ActorTimelineEvent {
  actorName?: string | null;
  actorRole?: string | null;
  actionTaken?: string | null;
  reason?: string | null;
  atLabel?: string | null;
}

export interface ActorTimelineFeedProps {
  events: ActorTimelineEvent[];
  emptyLabel?: string;
}

function actionPillClass(action?: string | null): string {
  const a = (action ?? "").toUpperCase();
  if (a.includes("APPROV") || a.includes("RESOLV")) {
    return "bg-action-success/15 text-action-success";
  }
  if (a.includes("REJECT") || a.includes("REVOK") || a.includes("FLAG")) {
    return "bg-action-danger/15 text-action-danger";
  }
  if (a.includes("ESCALAT") || a.includes("RECLASS")) {
    return "bg-amber-500/15 text-action-warning";
  }
  return "bg-action-primary/15 text-action-primary";
}

/**
 * ActorTimelineFeed — vertical "Who Did What & Why" story showing role badge,
 * actor name, action pill, quoted human reason/note, and timestamp.
 */
export function ActorTimelineFeed({
  events,
  emptyLabel = "No actor events recorded yet.",
}: ActorTimelineFeedProps) {
  if (events.length === 0) {
    return <p className="text-xs text-text-muted">{emptyLabel}</p>;
  }

  return (
    <ol className="space-y-2.5 border-l-2 border-border pl-3" aria-label="Actor rationale timeline">
      {events.map((ev, idx) => {
        const actor = ev.actorName?.trim() || "System";
        const role = ev.actorRole?.trim() || "Actor";
        const action = ev.actionTaken?.trim() || "UPDATED";
        return (
          <li key={`${actor}-${action}-${idx}`} className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                  {role}
                </span>
                <span className="font-semibold text-text-primary">{actor}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${actionPillClass(action)}`}
                >
                  {action}
                </span>
              </div>
              {ev.atLabel && (
                <span className="text-[11px] text-text-muted">{ev.atLabel}</span>
              )}
            </div>
            {ev.reason && (
              <blockquote className="bg-bg-elevated px-2.5 py-1.5 text-text-secondary">
                &ldquo;{ev.reason}&rdquo;
              </blockquote>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default ActorTimelineFeed;
