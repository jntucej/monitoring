"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/cinematic";

interface NarrativeProgressProps {
  total: number;
  activeIndex: number;
  labels: string[];
  onJump: (index: number) => void;
  visible: boolean;
}

export function NarrativeProgress({
  total,
  activeIndex,
  labels,
  onJump,
  visible,
}: NarrativeProgressProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndJump = (idx: number) => {
    buttonsRef.current[idx]?.focus();
    onJump(idx);
  };

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusAndJump((idx + 1) % total);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusAndJump((idx - 1 + total) % total);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusAndJump(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusAndJump(total - 1);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label="Narrative chapters"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.6, ease: EASE.gentle }}
          className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2"
        >
          <div
            role="radiogroup"
            aria-label="Narrative chapters"
            className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-2 backdrop-blur"
          >
            {Array.from({ length: total }, (_, i) => {
              const active = i === activeIndex;
              const label = labels[i] ?? `Chapter ${i + 1}`;
              return (
                <div key={i} className="group relative">
                  <button
                    ref={(el) => {
                      buttonsRef.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={label}
                    tabIndex={active ? 0 : -1}
                    onKeyDown={(e) => handleKey(e, i)}
                    onClick={() => onJump(i)}
                    className="flex h-8 min-w-8 items-center justify-center rounded-full px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
                  >
                    <motion.span
                      animate={{
                        width: active ? 22 : 6,
                        backgroundColor: active
                          ? "rgba(103,232,249,0.95)"
                          : "rgba(255,255,255,0.28)",
                      }}
                      transition={{ duration: 0.4, ease: EASE.gentle }}
                      className="block h-[3px] rounded-full"
                    />
                  </button>
                  {/* Hover label */}
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/75 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {String(i + 1).padStart(2, "0")} · {label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
