"use client";

import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/cinematic";

interface NarrativeProgressProps {
  total: number;
  activeIndex: number;
  onJump: (index: number) => void;
  visible: boolean;
}

export function NarrativeProgress({
  total,
  activeIndex,
  onJump,
  visible,
}: NarrativeProgressProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label="Narrative chapters"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.6, ease: EASE.gentle }}
          className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-2 backdrop-blur">
            {Array.from({ length: total }, (_, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onJump(i)}
                  aria-label={`Jump to chapter ${i + 1}`}
                  aria-current={active ? "true" : undefined}
                  className="flex items-center justify-center p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 focus-visible:rounded-full"
                >
                  <motion.span
                    animate={{
                      width: active ? 20 : 6,
                      backgroundColor: active
                        ? "rgba(103,232,249,0.9)"
                        : "rgba(255,255,255,0.25)",
                    }}
                    transition={{ duration: 0.4, ease: EASE.gentle }}
                    className="block h-[3px] rounded-full"
                  />
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
