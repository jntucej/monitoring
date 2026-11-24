"use client";

import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { InlineDiffBadge } from "@/components/shared/InlineDiffBadge";

export interface WhatHappenedReceiptProps {
  summary: string;
  affectedNote?: string;
  diff?: {
    label: string;
    before: string;
    after: string;
    tone?: "ok" | "warn" | "danger" | "info";
  } | null;
  nextHref?: string;
  nextLabel?: string;
  onDismiss?: () => void;
}

/**
 * WhatHappenedReceipt — persistent dismissible post-action confirmation card
 * showing what happened, state delta, affected entities/counts, and next step.
 */
export function WhatHappenedReceipt({
  summary,
  affectedNote,
  diff,
  nextHref,
  nextLabel,
  onDismiss,
}: WhatHappenedReceiptProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="surface-card bg-bg-surface p-3.5 space-y-2 text-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <CheckCircle2 className="size-4 text-action-success shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-text-primary">{summary}</p>
            {affectedNote && (
              <p className="text-text-secondary">{affectedNote}</p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss receipt"
            className="min-h-11 min-w-11 -my-2 -mr-2 inline-flex items-center justify-center text-text-muted hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {(diff || (nextHref && nextLabel)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div>
            {diff && (
              <InlineDiffBadge
                label={diff.label}
                before={diff.before}
                after={diff.after}
                tone={diff.tone ?? "ok"}
              />
            )}
          </div>
          {nextHref && nextLabel && (
            <Link
              href={nextHref}
              className="min-h-11 inline-flex items-center px-2 font-semibold text-action-primary underline"
            >
              {nextLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default WhatHappenedReceipt;
