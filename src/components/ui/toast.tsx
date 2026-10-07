"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

// ponytail: two toast APIs existed (context + zustand useUIStore) but only the
// context queue rendered. Context now proxies to useUIStore so all ~33 callers
// of useUIStore().addToast get visible toasts too — one queue, one renderer.

const toastIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
};

const toastStyles: Record<ToastVariant, string> = {
  success: "bg-[var(--action-primary)]/10 border-[var(--action-primary)]/30 text-[var(--action-primary)]",
  error: "bg-[var(--action-danger)]/10 border-[var(--action-danger)]/30 text-[var(--action-danger)]",
  info: "bg-[var(--action-info)]/10 border-[var(--action-info)]/30 text-[var(--action-info)]",
  warning: "bg-[var(--action-warning)]/10 border-[var(--action-warning)]/30 text-[var(--action-warning)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Single source of truth: the zustand UI store queue (already used by
  // useUIStore().addToast across the app). The context API becomes a thin
  // alias so legacy useToast() callers keep working.
  const toasts = useUIStore((s) => s.toasts);
  const storeAdd = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);
  const clearAllToasts = useUIStore((s) => s.clearAllToasts);

  const addToast = React.useCallback(
    (toast: Omit<ToastData, "id">) => storeAdd(toast),
    [storeAdd]
  );

  const clearAll = React.useCallback(() => clearAllToasts(), [clearAllToasts]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {ctx.toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm max-w-sm",
              toastStyles[t.variant]
            )}
          >
            {toastIcons[t.variant]}
            <div className="flex-1">
              {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button
              onClick={() => ctx.removeToast(t.id)}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
