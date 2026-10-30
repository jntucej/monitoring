"use client";

/* ── PrincipalConfirm ── */

import { memo } from "react";
import { AlertTriangle } from "lucide-react";

export interface PrincipalConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export const PrincipalConfirm = memo(function PrincipalConfirm({
  open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  variant = "warning", onConfirm, onCancel,
}: PrincipalConfirmProps) {
  if (!open) return null;
  const color = variant === "danger" ? "rose" : variant === "info" ? "sky" : "amber";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 text-${color}-400`} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg bg-${color}-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-${color}-600`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
});
