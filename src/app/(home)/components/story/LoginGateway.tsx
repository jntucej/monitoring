"use client";

import { Suspense, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { LoginForm } from "@/components/shared/LoginForm";
import { GlassPanel } from "../ui/GlassPanel";
import { SPRING_WEIGHT, SPRING_STORY } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import type { LivePayload } from "../hooks/useLiveData";

export function LoginGateway({ data }: { data: LivePayload | null }) {
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 26, mass: 1 });
  const textY = useTransform(progress, [0, 1], [30, -30]);
  const formY = useTransform(progress, [0, 1], [60, -30]);
  const formScale = useTransform(progress, [0, 0.5, 1], [0.96, 1, 1.01]);
  const useParallax = tier !== "static" && !reduced;

  return (
    <section
      ref={ref}
      id="login-gateway"
      className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-24 md:px-10"
    >
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
        <motion.div
          style={{ y: useParallax ? textY : 0 }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={reduced ? { duration: 0 } : SPRING_WEIGHT}
        >
          <div className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--home-accent-amber)]">
            <span>07</span>
            <span className="h-px w-8 bg-[var(--home-accent-amber)]" />
            <span>Sign in</span>
          </div>
          <h2 className="font-serif text-4xl leading-tight tracking-tight text-[var(--home-text-primary)] md:text-5xl">
            Check your journey here.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--home-text-secondary)] md:text-lg">
            Every entrance. Every exit. Every story. Protected.
          </p>
          <motion.div
            className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-[var(--home-border-soft)] pt-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {[
              { label: "On campus", value: data?.stats.onCampusNow ?? 0 },
              { label: "Scans today", value: data?.stats.scansToday ?? 0 },
              { label: "Modules", value: data?.modules?.filter((m) => m.active).length ?? 0 },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: SPRING_STORY },
                }}
              >
                <div className="text-[10px] uppercase tracking-widest text-[var(--home-text-muted)]">
                  {s.label}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--home-text-primary)]">
                  {s.value.toLocaleString()}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        <motion.div
          style={{
            y: useParallax ? formY : 0,
            scale: useParallax ? formScale : 1,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={reduced ? { duration: 0 } : { ...SPRING_WEIGHT, delay: 0.12 }}
          >
            <GlassPanel variant="strong" className="w-full px-8 py-10">
              <Suspense fallback={<div className="h-64" />}>
                <LoginForm
                  title="Welcome back"
                  subtitle="Sign in to continue your journey."
                />
              </Suspense>
            </GlassPanel>
          </motion.div>
        </motion.div>
      </div>
      <p className="mt-12 max-w-md text-center text-xs text-[var(--home-text-muted)] md:mx-auto">
        You control what is shared.{" "}
        <a
          href="/security"
          className="underline decoration-dotted underline-offset-2 hover:text-[var(--home-text-secondary)]"
        >
          See who can see what →
        </a>
      </p>
    </section>
  );
}
