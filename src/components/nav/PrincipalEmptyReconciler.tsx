"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";

export interface StageBucket {
  stage: string;
  count: number;
  href?: string;
  onSelect?: () => void;
}

export function PrincipalEmptyReconciler({
  activeFilterLabel,
  totalCount,
  buckets,
}: {
  activeFilterLabel: string;
  totalCount: number;
  buckets: StageBucket[];
}) {
  const nonEmpty = buckets.filter((b) => b.count > 0);
  if (totalCount <= 0 || nonEmpty.length === 0) return null;

  return (
    <div
      data-testid="principal-empty-reconciler"
      className="surface-card bg-bg-surface p-4 space-y-2.5"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
        <Layers className="h-4 w-4 text-action-primary shrink-0" />
        <span>
          0 items in <span className="font-mono">{activeFilterLabel}</span> —{" "}
          {totalCount} total across other stages:
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {nonEmpty.map((b) =>
          b.onSelect ? (
            <button
              key={b.stage}
              type="button"
              onClick={b.onSelect}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-primary hover:border-action-primary"
            >
              <span>{b.stage}</span>
              <span className="font-mono font-bold text-action-primary">
                {b.count}
              </span>
            </button>
          ) : b.href ? (
            <Link
              key={b.stage}
              href={b.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-primary hover:border-action-primary"
            >
              <span>{b.stage}</span>
              <span className="font-mono font-bold text-action-primary">
                {b.count}
              </span>
              <ArrowUpRight className="h-3 w-3 text-text-muted" />
            </Link>
          ) : (
            <span
              key={b.stage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-2.5 py-1 text-xs text-text-muted"
            >
              <span>{b.stage}</span>
              <span className="font-mono font-bold text-text-primary">
                {b.count}
              </span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}
