"use client";

/* ── SectionHeader ── */
/* Shared section header for principal surfaces. High-contrast, no icon
 * requirement (per rebuild spec: no icon on every KPI). One line:
 * label + optional hint + optional right-hand action slot.
 */

import { memo } from "react";

export function SectionHeader({
  label,
  hint,
  action,
}: {
  label: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
          {label}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default memo(SectionHeader);
