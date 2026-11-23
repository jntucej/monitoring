/**
 * nav/level0/SelfActionLoop — Level-0 (self/ward) "next-step" record pivot.
 *
 * Data-agnostic card: the caller passes the current record's title + optional
 * meta plus a list of next-step links. Rendered as a wrapping row of link
 * chips (label + optional badge + ArrowRight) so a user can pivot from a
 * selected record to its most useful follow-ups. Not an admin drawer — this
 * is the self/ward action loop, distinct from EntityInspector.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NextActionStep {
  label: string;
  href: string;
  badge?: string;
}

export function SelfActionLoop({
  title,
  meta,
  steps,
  className,
}: {
  title: string;
  meta?: string;
  steps: NextActionStep[];
  className?: string;
}) {
  return (
    <div className={cn("surface-card bg-bg-surface p-4 min-w-0", className)}>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Next steps
        </p>
        <h3 className="mt-0.5 truncate text-sm font-semibold text-text-primary">
          {title}
        </h3>
        {meta ? (
          <p className="mt-0.5 truncate text-xs text-text-muted">{meta}</p>
        ) : null}
      </div>

      {steps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((step) => (
            <Link
              key={step.href + step.label}
              href={step.href}
              className="surface-card inline-flex items-center gap-1.5 bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-surface hover:text-action-primary transition-colors motion-reduce:transition-none"
            >
              <span className="max-w-48 truncate">{step.label}</span>
              {step.badge ? (
                <span className="rounded-full bg-bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                  {step.badge}
                </span>
              ) : null}
              <ArrowRight className="h-3.5 w-3.5 text-text-muted" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default SelfActionLoop;
