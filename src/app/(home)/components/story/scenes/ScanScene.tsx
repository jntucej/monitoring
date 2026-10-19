"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { GlassPanel } from "../../ui/GlassPanel";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";
import { SPRING_STORY } from "../../hooks/useSpringConfig";

const SCANS = [
  { id: "SC-8841", name: "A. Kumar",  gate: "Main Gate",  status: "ok" },
  { id: "SC-8840", name: "S. Iyer",   gate: "Hostel 1",   status: "ok" },
  { id: "SC-8839", name: "R. Prasad", gate: "Main Gate",  status: "ok" },
  { id: "SC-8838", name: "X. Unknown",gate: "Main Gate",  status: "replay" },
  { id: "SC-8837", name: "M. Reddy",  gate: "Back Gate",  status: "ok" },
];

export function ScanScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const [count, setCount] = useState<number>(reduced ? SCANS.length : 0);

  useEffect(() => {
    if (reduced || tier === "static") { setCount(SCANS.length); return; }
    if (!inView) return;
    setCount(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= SCANS.length) clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, [inView, reduced, tier]);

  return (
    <div ref={ref} className="relative">
      <GlassPanel variant="cinema" className="overflow-hidden p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
            Scan feed
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#0EA5E9]">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]"
              animate={reduced ? {} : { opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            847 today
          </div>
        </div>
        {/* Kiosk window */}
        <div className="relative mb-4 overflow-hidden rounded-lg border border-[#0EA5E9]/30 bg-[#0EA5E9]/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 grid-cols-3 grid-rows-3 gap-0.5 rounded bg-white/10 p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`rounded-sm ${[0,2,3,5,6,8].includes(i) ? "bg-[#0EA5E9]" : "bg-white/20"}`} />
                ))}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-[var(--home-text-muted)]">nonce · {Date.now().toString().slice(-8)}</div>
                <div className="truncate text-sm text-[var(--home-text-primary)]">verifying…</div>
              </div>
            </div>
            <div className="rounded border border-[#10B981]/40 bg-[#10B981]/10 px-2 py-0.5 text-[10px] text-[#10B981]">
              valid
            </div>
          </div>
          {!reduced && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#0EA5E9]/20 to-transparent"
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
        {/* Feed */}
        <div className="space-y-1.5">
          {SCANS.slice(0, count).map((s) => {
            const isReplay = s.status === "replay";
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : SPRING_STORY}
                className={`flex items-center justify-between gap-3 rounded border px-2.5 py-1.5 text-xs ${
                  isReplay
                    ? "border-[#EF4444]/40 bg-[#EF4444]/5"
                    : "border-[var(--home-border-soft)] bg-[var(--home-glass-subtle-bg)]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--home-text-muted)]">{s.id}</span>
                  <span className="truncate text-[var(--home-text-primary)]">{s.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] text-[var(--home-text-muted)]">{s.gate}</span>
                  <span className={`text-[10px] font-medium ${isReplay ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                    {isReplay ? "replay blocked" : "ok"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
