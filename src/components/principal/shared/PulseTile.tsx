"use client";

/* ── PulseTile ── */
/* A single "needs a decision" tile: Now value + vs-last-week delta + spark.
 * Composes the shared MiniSparkline + DeltaBadge (reuse, not recreate).
 * Visual spec: light surface, no glass, no icon required, emerald/rose accents
 * only via the DeltaBadge (positive=mint, negative=rose).
 */

import { memo } from "react";
import { MiniSparkline } from "@/components/shared/MiniSparkline";
import { DeltaBadge } from "@/components/shared/DeltaBadge";

export function PulseTile({
  label,
  value,
  reference,
  referenceLabel = "vs last week",
  higherIsBetter = true,
  spark,
  action,
  drillTo,
  drillHint,
  onOpen,
}: {
  label: string;
  value: string | number;
  reference?: number | null;
  referenceLabel?: string;
  /** For "lower is better" metrics (complaints, incidents, ...). */
  higherIsBetter?: boolean;
  /** Optional numeric series (oldest → newest) for the trailing spark. */
  spark?: number[];
  /** Optional compact action slot on the right (e.g. "What to do"). */
  action?: React.ReactNode;
  /**
   * PR-05: make the metric a real drill-down. When set, the whole tile becomes
   * a keyboard-accessible button that navigates to the register this number
   * counts. No `drillTo` ⇒ non-interactive (backward compatible). The tile is
   * the affordance, not a decoration: it leads to the records behind the number.
   */
  drillTo?: string;
  /** Short affordance hint rendered on the drill affordance (default "View"). */
  drillHint?: string;
  /**
   * PR-05: the actual navigation callback (owns the route + context). When
   * provided, the tile is a button that calls this. Keeping navigation here
   * (rather than a hard `window.location.assign` inside the tile) preserves
   * client-side nav + the PR-03 return context. `drillTo` still drives the
   * visible affordance label and the accessible name.
   */
  onOpen?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </span>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-2xl sm:text-3xl font-bold text-text-primary">
            {value}
          </span>
          <DeltaBadge
            value={typeof value === "number" ? value : Number(value) || 0}
            reference={reference ?? null}
            label={referenceLabel}
            higherIsBetter={higherIsBetter}
          />
        </div>
        {spark && spark.length >= 2 ? (
          <MiniSparkline
            data={spark}
            width={88}
            height={30}
            color="var(--action-primary)"
            className="opacity-80"
          />
        ) : null}
      </div>
      {drillTo ? (
        <span
          className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-action-primary"
          aria-hidden="true"
        >
          {drillHint ?? "View"}
          <span aria-hidden="true">→</span>
        </span>
      ) : null}
    </>
  );

  // A drill affordance is a button (keyboard-operable, announces its target);
  // without one the tile is plain content (no fake interactivity).
  if (drillTo) {
    const navigate =
      onOpen ??
      (() => {
        // Fallback only if no explicit nav callback: hard navigate.
        window.location.assign(drillTo);
      });
    return (
      <button
        type="button"
        onClick={navigate}
        aria-label={`${label}: ${value} — ${drillHint ?? "view"} ${label} records`}
        className="surface-card bg-bg-surface p-4 flex flex-col gap-3 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary hover:-translate-y-0.5 transition-transform cursor-pointer"
      >
        {inner}
      </button>
    );
  }
  return <div className="surface-card bg-bg-surface p-4 flex flex-col gap-3">{inner}</div>;
}

export default memo(PulseTile);
