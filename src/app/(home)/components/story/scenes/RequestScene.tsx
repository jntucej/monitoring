"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { GlassPanel } from "../../ui/GlassPanel";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";
import { DUR_FAST, EASE_DRIFT } from "../../hooks/useSpringConfig";
import type { LivePayload } from "../../hooks/useLiveData";

function statusStyle(s: string) {
  if (s === "approved")
    return { color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)" };
  if (s === "rejected")
    return { color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)" };
  return { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" };
}

export function RequestScene({ data }: { data: LivePayload | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const rows = data?.requests ?? [];
  const [visible, setVisible] = useState<number>(reduced ? rows.length : 0);

  useEffect(() => {
    if (reduced || tier === "static") {
      setVisible(rows.length);
      return;
    }
    if (!inView || !rows.length) return;
    setVisible(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setVisible(i);
      if (i >= rows.length) clearInterval(timer);
    }, 450);
    return () => clearInterval(timer);
  }, [inView, reduced, tier, rows.length]);

  return (
    <div ref={ref} className="relative">
      <GlassPanel variant="cinema" className="overflow-hidden p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
            Live requests
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F59E0B]" />
            real · live
          </div>
        </div>
        {!rows.length && !data && (
          <div className="space-y-2 py-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-[var(--home-glass-subtle-bg)]"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}
        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.slice(0, visible).map((r) => {
              const st = statusStyle(r.status);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={
                    reduced ? { duration: 0 } : { duration: DUR_FAST, ease: EASE_DRIFT }
                  }
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--home-border-soft)] bg-[var(--home-glass-subtle-bg)] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="font-mono text-[10px] text-[var(--home-text-muted)]">
                      {r.id}
                    </div>
                    <div className="truncate text-sm text-[var(--home-text-primary)]">
                      {r.reason}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] text-[var(--home-text-muted)]">{r.time}</span>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{ color: st.color, background: st.bg, borderColor: st.border }}
                    >
                      {r.status}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {rows.length === 0 && data && (
          <div className="py-6 text-center text-sm text-[var(--home-text-muted)]">
            No requests yet today.
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
