"use client";

import React from "react";
import { X } from "lucide-react";

export interface ActiveFilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export function ActiveFilterBar({
  chips,
  shownCount,
  totalCount,
  onClearAll,
  noun = "records",
}: {
  chips: ActiveFilterChip[];
  shownCount: number;
  totalCount: number;
  onClearAll?: () => void;
  noun?: string;
}) {
  if (chips.length === 0 && shownCount === totalCount) return null;

  return (
    <div
      data-testid="active-filter-bar"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-bg-elevated/50 px-3 py-2 text-xs"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-surface px-2.5 py-0.5 text-xs font-medium text-text-primary hover:border-action-primary"
          >
            <span className="text-text-muted">{chip.label}:</span>
            <span>{chip.value}</span>
            <X className="h-3 w-3 text-text-muted" aria-hidden />
          </button>
        ))}
        {chips.length > 0 && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-1 text-xs font-semibold text-action-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <span className="font-mono text-[11px] text-text-muted">
        Showing <strong className="text-text-primary">{shownCount}</strong> of{" "}
        <strong className="text-text-primary">{totalCount}</strong> {noun}
      </span>
    </div>
  );
}
