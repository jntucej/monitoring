/**
 * EditableField — inline display-or-edit field with mandatory reason.
 * Shows value + PencilButton; on edit, reveals input + reason + Save/Cancel.
 * Use for any single-field edit-with-audit in a dashboard.
 */
"use client";

import React, { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditableFieldProps {
  /** Displayed value (pre-edit). */
  value: string;
  /** Called with new value + reason on save. */
  onSave: (newValue: string, reason: string) => Promise<void> | void;
  /** Human label shown in reason prompt. */
  fieldLabel?: string;
  className?: string;
  /** Prefix icon or badge rendered before the value. */
  prefix?: React.ReactNode;
}

export function EditableField({
  value,
  onSave,
  fieldLabel = "field",
  className,
  prefix,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDraft(value);
    setReason("");
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!reason.trim()) return setError("Reason required");
    setBusy(true);
    setError(null);
    try {
      await onSave(draft, reason.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          {prefix}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy || !draft.trim() || !reason.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-action-primary px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`Reason for editing ${fieldLabel} (required)`}
          className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center gap-1.5", className)}>
      {prefix}
      <span className="text-sm text-text-primary">{value}</span>
      <button
        type="button"
        onClick={start}
        aria-label={`Edit ${fieldLabel}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-action-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default EditableField;
