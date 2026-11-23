/**
 * nav/level1/FrontlineRecordBar — Level-1 (frontline execution) record bar.
 *
 * Data-agnostic compact bar: left side shows the record identifier in
 * mono (roll / ticket / code / ward scope, etc.); right side is a
 * wrapping row of <Link> action chips with an ArrowRight affordance so
 * a frontline operator / worker / caretaker / mess-incharge can pivot
 * from the record at hand to its most useful follow-ups.
 *
 * No page wiring here — the caller passes the record label and a list
 * of action links. The caller owns data (status, scope, counts, etc.);
 * this bar is purely a router surface.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FrontlinePivotAction {
  label: string;
  href: string;
}

export function FrontlineRecordBar({
  recordLabel,
  actions,
  className,
}: {
  recordLabel: string;
  actions: FrontlinePivotAction[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card bg-bg-surface border border-border p-3 min-w-0",
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="font-mono text-sm font-semibold text-text-primary break-all">
        {recordLabel}
      </p>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="surface-card inline-flex items-center gap-1 bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-bg-surface hover:text-action-primary transition-colors motion-reduce:transition-none"
            >
              <span className="max-w-40 truncate">{action.label}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-text-muted" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default FrontlineRecordBar;
