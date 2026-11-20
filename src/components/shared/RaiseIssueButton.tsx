/**
 * RaiseIssueButton — inline dispute/raise-issue trigger with reason modal.
 * On confirm calls `onSubmit` with the reason. Routes to approver inbox.
 */
"use client";

import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RaiseIssueButtonProps {
  /** What is being disputed */
  label: string;
  /** Optional preset reason categories shown as quick-pick chips */
  categories?: string[];
  onSubmit: (reason: string, category?: string) => Promise<void> | void;
  className?: string;
}

export function RaiseIssueButton({
  label,
  categories = [],
  onSubmit,
  className,
}: RaiseIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason.trim(), category);
      setOpen(false);
      setReason("");
      setCategory(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to raise issue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-500 hover:bg-rose-500/20",
          className
        )}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {categories.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-text-muted mb-1.5">Reason type</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                        category === c
                          ? "bg-rose-500 border-rose-500 text-white"
                          : "border-border text-text-secondary hover:bg-bg-elevated"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-text-muted" htmlFor="issue-reason">
                Details <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="issue-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Describe what went wrong…"
                className="mt-1 w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy || !reason.trim()}
                className="rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Submitting…" : "Raise issue"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RaiseIssueButton;
