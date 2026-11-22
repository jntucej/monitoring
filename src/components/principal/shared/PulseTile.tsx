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
}) {
  return (
    <div className="surface-card bg-bg-surface p-4 flex flex-col gap-3">
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
    </div>
  );
}

export default memo(PulseTile);
