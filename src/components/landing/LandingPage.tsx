"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ParticleField,
  AmbientGlow,
  useAtmosphereTheme,
  pageEnter,
  fadeUp,
  fadeIn,
} from "@/components/cinematic";
import { LoginBubbleField } from "./LoginBubbleField";

const SIGNALS = [
  { title: "The gate sees every crossing.", body: "Every scan, every direction, kept." },
  { title: "The pass remembers every promise.", body: "Approvals leave a trail you can read." },
  { title: "The night listens for anything out of place.", body: "Alerts surface quietly, before they grow." },
];

export function LandingPage() {
  const t = useAtmosphereTheme("campus");
  const reduce = useReducedMotion();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070B14] text-white">
      <div aria-hidden="true" className="absolute inset-0" style={{ background: t.vignette }} />
      <ParticleField color={t.accent} />
      <AmbientGlow color={t.glow} />

      <motion.div
        variants={pageEnter}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="relative z-10 flex min-h-screen flex-col"
      >
        <section className="flex flex-1 flex-col items-center justify-center px-6 pb-12 pt-24 text-center">
          <motion.p
            variants={fadeIn}
            className="mb-6 text-[10px] uppercase tracking-[0.3em] text-white/40"
          >
            Campus Access · Midnight Instrument
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="max-w-2xl text-3xl font-light tracking-tight md:text-5xl"
          >
            {t.microcopy.hero}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-lg text-sm text-white/60 md:text-base"
          >
            {t.microcopy.subhero}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-16 w-full">
            <p className="mb-6 text-[10px] uppercase tracking-[0.25em] text-white/30">
              Choose your door
            </p>
            <LoginBubbleField />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-12 flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            >
              Sign in
            </Link>
            <Link
              href="/help"
              className="text-xs text-white/40 transition hover:text-white/70"
            >
              How it works
            </Link>
          </motion.div>
        </section>

        <motion.section
          variants={fadeUp}
          className="mx-auto w-full max-w-4xl px-6 py-12"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {SIGNALS.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur"
              >
                <p className="text-sm font-medium text-white/85">{s.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{s.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <footer className="relative z-10 px-6 py-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">
            {t.microcopy.footer}
          </p>
        </footer>
      </motion.div>
    </main>
  );
}
