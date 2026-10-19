"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { GlassPanel } from "../../ui/GlassPanel";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";

const AUDIT = [
  "USER_LOGIN       a.kumar        ✓",
  "PASS_APPROVED    warden.1       ✓",
  "SCAN_OK          main-gate      ✓",
  "MFA_ENROLLED     s.iyer         ✓",
  "LOCKDOWN_TEST    system         ✓",
];

export function ShieldScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const [count, setCount] = useState<number>(reduced ? AUDIT.length : 0);
  const [lockdown, setLockdown] = useState<boolean>(false);

  useEffect(() => {
    if (reduced || tier === "static") { setCount(AUDIT.length); return; }
    if (!inView) return;
    setCount(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= AUDIT.length) clearInterval(timer);
    }, 400);
    return () => clearInterval(timer);
  }, [inView, reduced, tier]);

  useEffect(() => {
    if (reduced || tier === "static" || !inView) return;
    const t1 = setTimeout(() => setLockdown(true), 1200);
    const t2 = setTimeout(() => setLockdown(false), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [inView, reduced, tier]);

  return (
    <div ref={ref} className="relative">
      <GlassPanel variant="cinema" className="overflow-hidden p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
            Audit trail · live
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#EF4444]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EF4444]" />
            monitored
          </div>
        </div>
        <div className="mb-4 space-y-1 rounded-lg border border-[var(--home-border-soft)] bg-black/30 p-3 font-mono text-[11px] text-[#CBD5E1]">
          {AUDIT.slice(0, count).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="whitespace-pre"
            >
              {line}
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 p-3 text-center">
            <Fingerprint className="mx-auto mb-1.5 h-4 w-4 text-[#10B981]" />
            <div className="text-[9px] uppercase tracking-wider text-[var(--home-text-muted)]">WebAuthn</div>
            <div className="mt-0.5 text-[10px] font-medium text-[#10B981]">active</div>
          </div>
          <div className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 p-3 text-center">
            <Lock className="mx-auto mb-1.5 h-4 w-4 text-[#10B981]" />
            <div className="text-[9px] uppercase tracking-wider text-[var(--home-text-muted)]">MFA</div>
            <div className="mt-0.5 text-[10px] font-medium text-[#10B981]">enforced</div>
          </div>
          <div className={`rounded-lg border p-3 text-center transition-colors ${
            lockdown
              ? "border-[#EF4444]/60 bg-[#EF4444]/15"
              : "border-[var(--home-border-soft)] bg-[var(--home-glass-subtle-bg)]"
          }`}>
            <ShieldCheck className={`mx-auto mb-1.5 h-4 w-4 ${lockdown ? "text-[#EF4444]" : "text-[var(--home-text-muted)]"}`} />
            <div className="text-[9px] uppercase tracking-wider text-[var(--home-text-muted)]">Lockdown</div>
            <div className={`mt-0.5 text-[10px] font-medium ${lockdown ? "text-[#EF4444]" : "text-[var(--home-text-muted)]"}`}>
              {lockdown ? "TEST" : "armed"}
            </div>
          </div>
        </div>
        {lockdown && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            style={{ background: "#EF4444" }}
          />
        )}
      </GlassPanel>
    </div>
  );
}
