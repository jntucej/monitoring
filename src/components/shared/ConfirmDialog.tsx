"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";

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
  const variantStyles = {
    destructive: "bg-action-danger hover:bg-rose-600 text-white",
    primary: "bg-action-primary hover:bg-blue-600 text-white",
    warning: "bg-action-warning hover:bg-amber-600 text-white",
  };

  return (
    <Modal isOpen={open} onClose={onClose} showClose={false} size="sm">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`flex-shrink-0 size-6 rounded-xl flex items-center justify-center ${
            variant === "destructive"
              ? "bg-rose-500/20 text-action-danger"
              : variant === "warning"
                ? "bg-amber-500/20 text-action-warning"
                : "bg-blue-500/20 text-action-primary"
          }`}
        >
          {variant === "destructive" && <AlertTriangle className="h-5 w-5" />}
          {variant === "warning" && <AlertTriangle className="h-5 w-5" />}
          {variant === "primary" && <CheckCircle className="h-5 w-5" />}
        </div>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      </div>

      <p className="text-sm text-text-muted mb-6">{body}</p>

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="surface-card px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${variantStyles[variant]}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
