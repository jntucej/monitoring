"use client";

import { ArrowRight, ShieldAlert } from "lucide-react";

export interface ActionConsequencePreviewProps {
  nextState: string;
  sideEffects?: string[];
  requiresReason?: boolean;
  tone?: "primary" | "secondary" | "danger";
}

/**
 * ActionConsequencePreview — compact before-you-click impact card showing:
 * - Next State (e.g. "Stage moves: HOD -> Vice Principal")
 * - Side Effects (e.g. "Notifies guardian · Unlocks gate QR · Writes audit entry")
 * - Required Input indicator when reason is mandatory
 */
export function ActionConsequencePreview({
  nextState,
  sideEffects = [],
  requiresReason = false,
  tone = "secondary",
}: ActionConsequencePreviewProps) {
  const borderTone =
    tone === "danger"
      ? "bg-action-danger/10 text-action-danger"
      : tone === "primary"
        ? "bg-action-primary/10 text-action-primary"
        : "bg-bg-elevated text-text-secondary";

  return (
    <div className={`px-3 py-2 text-[11px] space-y-1 ${borderTone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-text-primary">
          <ArrowRight className="size-3 shrink-0" />
          Next State: {nextState}
        </span>
        {requiresReason && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-action-warning">
            <ShieldAlert className="size-3 shrink-0" />
            Reason required
          </span>
        )}
      </div>
      {sideEffects.length > 0 && (
        <p className="text-text-muted">
          Side Effects: {sideEffects.join(" · ")}
        </p>
      )}
    </div>
  );
}

export default ActionConsequencePreview;
