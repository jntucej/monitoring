"use client";

import React from "react";
import { AlertCircle, RotateCcw, Save } from "lucide-react";

export function UnsavedChangesBar({
  hasUnsavedChanges,
  onSave,
  onDiscard,
  saving = false,
}: {
  hasUnsavedChanges: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saving?: boolean;
}) {
  if (!hasUnsavedChanges) return null;

  return (
    <div
      data-testid="unsaved-changes-bar"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-action-warning">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Unsaved changes</span>
      </span>
      <div className="flex items-center gap-2">
        {onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-surface px-2.5 py-1 font-medium text-text-primary hover:bg-bg-elevated disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Discard</span>
          </button>
        )}
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-action-primary px-2.5 py-1 font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            <Save className="h-3 w-3" />
            <span>{saving ? "Saving..." : "Save"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
