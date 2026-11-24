"use client";

import { useState } from "react";

export interface DecisionOption<TAction extends string> {
  action: TAction;
  label: string;
  tone?: "primary" | "secondary" | "danger";
  requiresReason?: boolean;
}

export interface DecisionItemCardProps<TAction extends string> {
  title: string;
  subtitle: string;
  contextBadge: string;
  whyItNeedsAction: string;
  decisions: DecisionOption<TAction>[];
  busyAction: TAction | null;
  onDecide: (action: TAction, reason?: string) => Promise<void> | void;
}

const TONE_CLS: Record<NonNullable<DecisionOption<string>["tone"]>, string> = {
  primary: "bg-action-primary text-white hover:opacity-90",
  secondary: "bg-bg-elevated text-text-secondary hover:text-text-primary",
  danger: "bg-action-danger text-white hover:opacity-90",
};

/**
 * DecisionItemCard — inline decision-making card for approvers, operators,
 * and admins. Supports optional inline reason input (no browser prompt())
 * and immediate busy/disabled feedback.
 */
export function DecisionItemCard<TAction extends string>({
  title,
  subtitle,
  contextBadge,
  whyItNeedsAction,
  decisions,
  busyAction,
  onDecide,
}: DecisionItemCardProps<TAction>) {
  const [pendingReasonAction, setPendingReasonAction] = useState<TAction | null>(null);
  const [reasonText, setReasonText] = useState("");

  const handleOptionClick = (opt: DecisionOption<TAction>) => {
    if (opt.requiresReason) {
      setPendingReasonAction(opt.action);
      setReasonText("");
      return;
    }
    void onDecide(opt.action);
  };

  const submitReason = () => {
    if (!pendingReasonAction || !reasonText.trim()) return;
    const act = pendingReasonAction;
    const txt = reasonText.trim();
    setPendingReasonAction(null);
    setReasonText("");
    void onDecide(act, txt);
  };

  return (
    <article className="surface-card bg-bg-surface p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">{title}</h3>
          <p className="text-xs text-text-muted truncate">{subtitle}</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-bg-elevated text-xs font-medium text-text-secondary shrink-0">
          {contextBadge}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-text-secondary">{whyItNeedsAction}</p>

      {pendingReasonAction ? (
        <div className="space-y-2 pt-1">
          <input
            type="text"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Enter reason (required)…"
            aria-label={`Reason for ${pendingReasonAction}`}
            className="w-full rounded-lg bg-bg-elevated px-3 py-2 text-xs text-text-primary focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!reasonText.trim() || Boolean(busyAction)}
              onClick={submitReason}
              className="rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingReasonAction(null);
                setReasonText("");
              }}
              className="rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {decisions.map((opt) => {
            const isBusy = busyAction === opt.action;
            const toneCls = TONE_CLS[opt.tone ?? "secondary"];
            return (
              <button
                key={opt.action}
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => handleOptionClick(opt)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50 ${toneCls}`}
              >
                {isBusy ? "Applying…" : opt.label}
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default DecisionItemCard;
