"use client";

import * as React from "react";
import { Toast as HeroToast, toast as heroToast } from "@heroui/react";
import { useUIStore } from "@/stores/uiStore";
import { useIsSakuga } from "@/components/student/useIsSakuga";

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
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
  const isSakuga = useIsSakuga();
  const sakugaToastRef = React.useRef<HTMLElement & { show?: (text?: string) => void }>(null);
  const seenIdsRef = React.useRef<Set<string>>(new Set());

  const visibleToasts = React.useMemo(() => (ctx ? ctx.toasts.slice(-3) : []), [ctx]);
  const latestToast = visibleToasts[visibleToasts.length - 1];

  React.useEffect(() => {
    if (!isSakuga || !latestToast || seenIdsRef.current.has(latestToast.id)) return;
    seenIdsRef.current.add(latestToast.id);
    const text = latestToast.title
      ? `${latestToast.title}: ${latestToast.message}`
      : latestToast.message;
    sakugaToastRef.current?.show?.(text);
  }, [isSakuga, latestToast]);

  React.useEffect(() => {
    if (isSakuga || !ctx) return;
    for (const t of visibleToasts) {
      if (seenIdsRef.current.has(t.id)) continue;
      seenIdsRef.current.add(t.id);
      const variant =
        t.variant === "error"
          ? "danger"
          : t.variant === "warning"
          ? "warning"
          : t.variant === "success"
          ? "success"
          : "accent";
      heroToast(t.title ?? t.message, {
        description: t.title ? t.message : undefined,
        variant,
        timeout: t.duration ?? 4000,
        onClose: () => ctx.removeToast(t.id),
      });
    }
  }, [isSakuga, ctx, visibleToasts]);

  if (!ctx) return null;

  if (isSakuga) {
    return (
      <div
        className="fixed bottom-6 left-6 z-[60] pointer-events-auto"
        aria-live="polite"
        aria-atomic="false"
      >
        <sakuga-toast ref={sakugaToastRef} duration="2.8" />
      </div>
    );
  }

  return (
    <HeroToast.Provider
      placement="bottom end"
      maxVisibleToasts={3}
      className="z-[60]"
    />
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
