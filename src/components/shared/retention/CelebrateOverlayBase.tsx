"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface CelebrateOverlayBaseProps {
  queueEmpty: boolean;
  celebrating: boolean;
  sessionDecisions: number;
  onTrigger: () => void;
  onMarkCelebrated: () => void;
}

export function CelebrateOverlayBase({
  queueEmpty,
  celebrating,
  sessionDecisions,
  onTrigger,
  onMarkCelebrated,
}: CelebrateOverlayBaseProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        x: (((i * 73) % 100) / 100 - 0.5) * 400,
        y: (((i * 41) % 100) / 100 - 0.5) * 300,
        color:
          i % 3 === 0
            ? "var(--action-primary)"
            : i % 3 === 1
            ? "var(--action-warning)"
            : "var(--action-info)",
      })),
    [],
  );

  useEffect(() => {
    if (queueEmpty && sessionDecisions > 0) {
      onTrigger();
      const t = setTimeout(onMarkCelebrated, 1800);
      return () => clearTimeout(t);
    }
  }, [queueEmpty, sessionDecisions, onTrigger, onMarkCelebrated]);

  return (
    <AnimatePresence>
      {celebrating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="surface-card bg-bg-surface px-8 py-6 text-center"
          >
            <p className="text-2xl font-bold text-action-primary">Queue cleared</p>
            <p className="mt-1 text-sm text-text-muted border-0">
              {sessionDecisions} decision{sessionDecisions === 1 ? "" : "s"} this session
            </p>
          </motion.div>

          {particles.map((p, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: p.x,
                y: p.y,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{ duration: 1.4, delay: i * 0.02 }}
              className="absolute size-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
