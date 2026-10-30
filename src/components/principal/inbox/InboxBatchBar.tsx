"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InboxBatchBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  isLoading?: boolean;
  lastResult?: { ok: number; fail: number } | null;
}

/**
 * InboxBatchBar — sticky bottom bar shown when tickets are selected.
 */
export function InboxBatchBar({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  isLoading = false,
  lastResult,
}: InboxBatchBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border)] shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {selectedCount} selected
          </span>
          {lastResult && (
            <span
              className={`text-xs ${
                lastResult.fail > 0 ? "text-amber-500" : "text-emerald-500"
              }`}
            >
              {lastResult.ok} ok, {lastResult.fail} failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={onClear} disabled={isLoading}>
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
          <Button size="sm" variant="primary" onClick={onApprove} disabled={isLoading}>
            <span className="text-xs">Approve ({selectedCount})</span>
          </Button>
          <Button size="sm" variant="danger" onClick={onReject} disabled={isLoading}>
            <span className="text-xs">Reject ({selectedCount})</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
