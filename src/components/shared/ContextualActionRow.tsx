"use client";

import { useState } from "react";
import { WorkflowChainTracker } from "@/components/shared/WorkflowChainTracker";
import { ActorTimelineFeed } from "@/components/shared/ActorTimelineFeed";
import { ActionConsequencePreview } from "@/components/shared/ActionConsequencePreview";

export interface ActorEventContext {
  actorName: string;
  actorRole: string;
  actionTaken: string;
  reason?: string | null;
  atLabel: string;
}

export interface RowActionSpec<TAction extends string> {
  action: TAction;
  label: string;
  tone?: "primary" | "secondary" | "danger";
  consequence: string;
  requiresReason?: boolean;
  disabledReason?: string;
}

export interface ContextualRowData<TAction extends string> {
  id: string;
  primaryTitle: string;
  secondaryMeta: string;
  liveStateBadge: string;
  situationSummary: string;
  latestActorEvent?: ActorEventContext;
  historyCount?: number;
  workflowStage?: string | null;
  workflowStatus?: string | null;
  workflowEvents?: Array<{
    actorName?: string | null;
    actorRole?: string | null;
    actionTaken?: string | null;
    reason?: string | null;
    atLabel?: string | null;
  }>;
  actions: RowActionSpec<TAction>[];
}

export interface ContextualActionRowProps<TAction extends string> {
  row: ContextualRowData<TAction>;
  busyAction: TAction | null;
  onAction: (action: TAction, reason?: string) => Promise<void> | void;
}

const TONE_CLS: Record<NonNullable<RowActionSpec<string>["tone"]>, string> = {
  primary: "bg-action-primary text-white hover:opacity-90",
  secondary: "bg-bg-elevated text-text-secondary hover:text-text-primary",
  danger: "bg-action-danger text-white hover:opacity-90",
};

/**
 * ContextualActionRow — high-context, action-transparent row/card exposing:
 * 1. Entity & live state
 * 2. Situation summary (why it needs attention)
 * 3. Latest actor rationale (who acted last and why)
 * 4. Reason-gated actions with consequence preview
 */
export function ContextualActionRow<TAction extends string>({
  row,
  busyAction,
  onAction,
}: ContextualActionRowProps<TAction>) {
  const [pendingSpec, setPendingSpec] = useState<RowActionSpec<TAction> | null>(null);
  const [reasonText, setReasonText] = useState("");

  const handleClick = (spec: RowActionSpec<TAction>) => {
    if (spec.disabledReason) return;
    if (spec.requiresReason) {
      setPendingSpec(spec);
      setReasonText("");
      return;
    }
    void onAction(spec.action);
  };

  const submitReason = () => {
    if (!pendingSpec || !reasonText.trim()) return;
    const act = pendingSpec.action;
    const txt = reasonText.trim();
    setPendingSpec(null);
    setReasonText("");
    void onAction(act, txt);
  };

  return (
    <article className="surface-card bg-bg-surface p-4 flex flex-col gap-3">
      {/* Top strip: identity + live state/SLA pill */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {row.primaryTitle}
          </h3>
          <p className="text-xs text-text-muted truncate">{row.secondaryMeta}</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-bg-elevated text-xs font-medium text-text-secondary shrink-0">
          {row.liveStateBadge}
        </span>
      </div>

      {/* Situation line */}
      <p className="text-xs leading-relaxed text-text-secondary">
        {row.situationSummary}
      </p>

      {/* Compact workflow stage pipeline */}
      {(row.workflowStage || row.workflowStatus) && (
        <WorkflowChainTracker
          currentStage={row.workflowStage}
          ticketStatus={row.workflowStatus}
          events={row.workflowEvents}
          compact
        />
      )}

      {/* Actor rationale block + expandable full timeline */}
      {row.latestActorEvent && (
        <div className="bg-bg-elevated px-3 py-2 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-text-primary">
              {row.latestActorEvent.actorName} ({row.latestActorEvent.actorRole}) ·{" "}
              {row.latestActorEvent.actionTaken}
            </span>
            <span className="text-[11px] text-text-muted">
              {row.latestActorEvent.atLabel}
              {row.historyCount && row.historyCount > 1
                ? ` · ${row.historyCount} events`
                : ""}
            </span>
          </div>
          {row.latestActorEvent.reason && (
            <p className="text-text-secondary">
              &ldquo;{row.latestActorEvent.reason}&rdquo;
            </p>
          )}
          {row.workflowEvents && row.workflowEvents.length > 1 && (
            <details className="pt-1">
              <summary className="cursor-pointer text-[11px] font-medium text-action-primary">
                View full actor trail ({row.workflowEvents.length})
              </summary>
              <div className="mt-2">
                <ActorTimelineFeed events={row.workflowEvents} />
              </div>
            </details>
          )}
        </div>
      )}

      {/* Action bar with consequence preview or inline reason prompt */}
      {pendingSpec ? (
        <div className="space-y-2 pt-1">
          <ActionConsequencePreview
            nextState={pendingSpec.consequence}
            sideEffects={["Notifies student & guardian", "Writes audit log entry"]}
            requiresReason={pendingSpec.requiresReason}
            tone={pendingSpec.tone}
          />
          <input
            type="text"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder={`Reason for ${pendingSpec.label.toLowerCase()} (required)…`}
            aria-label={`Reason for ${pendingSpec.label}`}
            className="w-full min-h-11 bg-bg-elevated px-3 py-2 text-xs text-text-primary focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!reasonText.trim() || Boolean(busyAction)}
              onClick={submitReason}
              className="min-h-11 bg-action-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Confirm {pendingSpec.label}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingSpec(null);
                setReasonText("");
              }}
              className="min-h-11 bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {row.actions.map((spec) => {
              const isBusy = busyAction === spec.action;
              const toneCls = TONE_CLS[spec.tone ?? "secondary"];
              return (
                <button
                  key={spec.action}
                  type="button"
                  title={spec.disabledReason ?? spec.consequence}
                  disabled={Boolean(busyAction) || Boolean(spec.disabledReason)}
                  onClick={() => handleClick(spec)}
                  className={`min-h-11 px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50 ${toneCls}`}
                >
                  {isBusy ? "Applying…" : spec.label}
                </button>
              );
            })}
          </div>
          {row.actions[0]?.consequence && (
            <ActionConsequencePreview
              nextState={row.actions.map((a) => `${a.label} → ${a.consequence}`).join(" · ")}
              sideEffects={["Updates workflow stage", "Writes audit entry"]}
              requiresReason={row.actions.some((a) => a.requiresReason)}
            />
          )}
        </div>
      )}
    </article>
  );
}

export default ContextualActionRow;
