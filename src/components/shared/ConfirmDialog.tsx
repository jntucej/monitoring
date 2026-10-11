"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "primary" | "warning";
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
}: ConfirmDialogProps) {
  if (!open) return null;

  const variantStyles = {
    destructive: "bg-rose-500 hover:bg-rose-600 text-white",
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            variant === "destructive" ? "bg-rose-500/20 text-rose-400" :
            variant === "warning" ? "bg-amber-500/20 text-amber-400" :
            "bg-blue-500/20 text-blue-400"
          }`}>
            {variant === "destructive" && <AlertTriangle className="h-5 w-5" />}
            {variant === "warning" && <AlertTriangle className="h-5 w-5" />}
            {variant === "primary" && <CheckCircle className="h-5 w-5" />}
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>

        <p className="text-sm text-[var(--text-muted)] mb-6">{body}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${variantStyles[variant]} transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}