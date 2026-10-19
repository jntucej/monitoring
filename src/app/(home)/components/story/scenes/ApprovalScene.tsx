"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { GlassPanel } from "../../ui/GlassPanel";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";
import { SPRING_STORY } from "../../hooks/useSpringConfig";

const NODES = ["HOD", "Warden", "Principal", "Gate"];

export function ApprovalScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const [active, setActive] = useState<number>(reduced ? NODES.length : -1);

  useEffect(() => {
    if (reduced || tier === "static") { setActive(NODES.length); return; }
    if (!inView) return;
    setActive(-1);
    let i = -1;
    const timer = setInterval(() => {
      i += 1;
      setActive(i);
      if (i >= NODES.length) clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, [inView, reduced, tier]);

  const done = active >= NODES.length;

  return (
    <div ref={ref} className="relative">
      <GlassPanel variant="cinema" className="overflow-hidden p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
            Approval chain
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
            {done ? "approved" : "in progress"}
          </motion.div>
        </div>
        <div className="relative flex items-center justify-between px-2">
          {/* Connection line */}
          <div className="absolute left-6 right-6 top-1/2 -z-0 h-px -translate-y-1/2 bg-[var(--home-border-soft)]" />
          {!reduced && (
            <motion.div
              className="absolute left-6 top-1/2 h-px -translate-y-1/2 bg-[#10B981]"
              initial={{ width: 0 }}
              animate={{ width: active >= 0 ? `${Math.min(active, NODES.length - 1) * 100 / (NODES.length - 1)}%` : 0 }}
              transition={SPRING_STORY}
              style={{ right: undefined }}
            />
          )}
          {NODES.map((label, i) => {
            const lit = i < active || done;
            const current = i === active && !done;
            return (
              <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                <motion.div
                  animate={{
                    scale: current ? [1, 1.15, 1] : 1,
                  }}
                  transition={current ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : {}}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    lit
                      ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                      : "border-[var(--home-border-soft)] bg-[var(--home-glass-subtle-bg)] text-[var(--home-text-muted)]"
                  }`}
                >
                  {lit ? "✓" : i + 1}
                </motion.div>
                <div className={`text-[10px] uppercase tracking-wider ${lit ? "text-[#10B981]" : "text-[var(--home-text-muted)]"}`}>
                  {label}
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
          Pass generated · QR ready · 3.2s total
        </motion.div>
      </GlassPanel>
    </div>
  );
}
