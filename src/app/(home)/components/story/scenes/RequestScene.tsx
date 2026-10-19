"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";
import { GlassPanel } from "../../ui/GlassPanel";
import { SPRING_STORY } from "../../hooks/useSpringConfig";

const SEED = [
  { id: "PS-2411", name: "A. Kumar",  reason: "Home out",     status: "pending" },
  { id: "PS-2410", name: "S. Iyer",   reason: "Medical",       status: "approved" },
  { id: "PS-2409", name: "R. Prasad", reason: "Weekend out",   status: "approved" },
  { id: "PS-2408", name: "M. Reddy",  reason: "Exam prep",     status: "pending" },
  { id: "PS-2407", name: "K. Nair",   reason: "Family visit",  status: "approved" },
  { id: "PS-2406", name: "P. Verma",  reason: "Day out",       status: "pending" },
];

function statusStyle(s: string) {
  if (s === "approved") return { color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)" };
  if (s === "rejected") return { color: "#EF4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)" };
  return { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" };
}

export function RequestScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const [visible, setVisible] = useState<number>(reduced ? SEED.length : 0);

  useEffect(() => {
    if (reduced || tier === "static") { setVisible(SEED.length); return; }
    if (!inView) return;
    setVisible(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= SEED.length) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [inView, reduced, tier]);

  return (
    <div ref={ref} className="relative">
      <GlassPanel variant="cinema" className="overflow-hidden p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
            Live requests
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F59E0B]" />
            live
          </div>
        </div>
        <div className="space-y-2">
          {SEED.slice(0, visible).map((r, i) => {
            const st = statusStyle(r.status);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : { ...SPRING_STORY, delay: i === visible - 1 ? 0 : 0 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--home-border-soft)] bg-[var(--home-glass-subtle-bg)] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="font-mono text-[10px] text-[var(--home-text-muted)]">{r.id}</div>
                  <div className="truncate text-sm text-[var(--home-text-primary)]">{r.name}</div>
                  <div className="truncate text-xs text-[var(--home-text-muted)]">{r.reason}</div>
                </div>
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: st.color, background: st.bg, borderColor: st.border }}
                >
                  {r.status}
                </span>
              </motion.div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
