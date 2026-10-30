"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface SuccessFlashProps {
  onDismiss?: () => void;
  autoDismissMs?: number;
  children?: React.ReactNode;
  direction?: "IN" | "OUT";
  reason?: string;
}

export function SuccessFlash({ onDismiss, autoDismissMs = 500, children, direction, reason }: SuccessFlashProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (autoDismissMs <= 0) return;

    timerRef.current = setTimeout(() => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      onDismiss?.();
    }, autoDismissMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [onDismiss, autoDismissMs]);

  const heading =
    direction === "IN"
      ? "Entry Recorded"
      : direction === "OUT"
        ? "Exit Recorded"
        : "Scan Recorded!";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--action-primary)] text-slate-950 select-none"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      >
        <CheckCircle className="w-24 h-24 text-slate-950" aria-hidden="true" />
      </motion.div>
      {children || (
        <>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-3xl font-extrabold tracking-tight"
          >
            {heading}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-xs font-semibold uppercase tracking-wider bg-slate-950/10 px-3 py-1 rounded-full text-slate-900"
          >
            {reason ? `${reason} · ` : ""}Next scan ready
          </motion.p>
        </>
      )}
    </motion.div>
  );
}
