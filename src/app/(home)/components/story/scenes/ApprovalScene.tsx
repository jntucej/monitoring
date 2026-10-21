"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { GlassPanel } from "../../ui/GlassPanel";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";
import { SPRING_STORY } from "../../hooks/useSpringConfig";

const STEPS = [
  { key: "intent", label: "Intent", icon: "◇" },
  { key: "request", label: "Pass requested", icon: "◈" },
  { key: "confirm", label: "Confirmed", icon: "◆" },
];

export function ApprovalScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const [active, setActive] = useState<number>(reduced ? STEPS.length : -1);

  useEffect(() => {
    if (reduced || tier === "static") {
      setActive(STEPS.length);
      return;
    }
    if (!inView) return;
    setActive(-1);
    let i = -1;
    const timer = setInterval(() => {
      i += 1;
      setActive(i);
      if (i >= STEPS.length) clearInterval(timer);
    }, 850);
    return () => clearInterval(timer);
  }, [inView, reduced, tier]);

  const done = active >= STEPS.length;

  return (
    <div ref={ref} className="relative">
      <GlassPanel variant="cinema" className="overflow-hidden p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
            Request lifecycle
          </div>
          <motion.div
            key={done ? "done" : "pending"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              done
                ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"
                : "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
            }`}
          >
            {done ? "confirmed" : "in progress"}
          </motion.div>
        </div>
        <div className="relative flex items-start justify-between px-4">
          <div className="absolute left-10 right-10 top-5 -z-0 h-px bg-[var(--home-border-soft)]" />
          {!reduced && (
            <motion.div
              className="absolute left-10 top-5 h-px -translate-y-0 bg-[#10B981]"
              initial={{ width: 0 }}
              animate={{
                width:
                  active >= 0
                    ? `${Math.min(active, STEPS.length - 1) * 100 / (STEPS.length - 1)}%`
                    : 0,
              }}
              transition={SPRING_STORY}
              style={{ maxWidth: "calc(100% - 80px)" }}
            />
          )}
          {STEPS.map((step, i) => {
            const lit = i < active || done;
            const current = i === active && !done;
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                <motion.div
                  animate={current ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={
                    current ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}
                  }
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    lit
                      ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                      : "border-[var(--home-border-soft)] bg-[var(--home-glass-subtle-bg)] text-[var(--home-text-muted)]"
                  }`}
                >
                  {lit ? "✓" : step.icon}
                </motion.div>
                <div
                  className={`text-center text-[10px] uppercase tracking-wider ${
                    lit ? "text-[#10B981]" : "text-[var(--home-text-muted)]"
                  }`}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8 }}
          transition={{ duration: 0.4 }}
          className="mt-6 rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 px-4 py-3 text-center text-sm text-[#10B981]"
        >
          Pass generated · ready to scan
        </motion.div>
      </GlassPanel>
    </div>
  );
}
