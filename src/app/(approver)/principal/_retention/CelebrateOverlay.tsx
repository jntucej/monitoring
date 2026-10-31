"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";

/**
 * Fires a small celebration when the queue hits zero AFTER at least one
 * decision this session. Not on the initial empty state — only after a
 * transition from >0 to 0.
 */
export function CelebrateOverlay({ queueEmpty }: { queueEmpty: boolean }) {
  const celebrating = usePrincipalRetention((s) => s.celebrating);
  const sessionDecisions = usePrincipalRetention((s) => s.sessionDecisions);
  const markCelebrated = usePrincipalRetention((s) => s.markCelebrated);

  // Trigger celebration when the queue transitions to empty with decisions
  useEffect(() => {
    if (queueEmpty && sessionDecisions > 0) {
      usePrincipalRetention.setState({ celebrating: true });
      const t = setTimeout(markCelebrated, 1800);
      return () => clearTimeout(t);
    }
  }, [queueEmpty, sessionDecisions, markCelebrated]);

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
            className="rounded-2xl bg-[var(--bg-surface)] px-8 py-6 text-center shadow-2xl"
          >
            <p className="text-2xl font-bold text-[var(--action-primary)]">Queue cleared</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {sessionDecisions} decision{sessionDecisions === 1 ? "" : "s"} this session
            </p>
          </motion.div>

          {/* Confetti dots */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 300,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{ duration: 1.4, delay: i * 0.02 }}
              className="absolute size-2 rounded-full"
              style={{
                backgroundColor:
                  i % 3 === 0
                    ? "var(--action-primary)"
                    : i % 3 === 1
                    ? "var(--action-warning)"
                    : "var(--action-info)",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
