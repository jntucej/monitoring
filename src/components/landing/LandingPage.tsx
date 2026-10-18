"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ParticleField,
  AmbientGlow,
  CursorHalo,
  Fireflies,
  useAtmosphereTheme,
  useTimeGreeting,
  pageEnter,
  fadeUp,
  fadeIn,
  DURATION,
  EASE,
} from "@/components/cinematic";
import { LoginBubbleField } from "./LoginBubbleField";
import { LiveStatePill } from "./LiveStatePill";

const SIGNALS = [
  { title: "The gate sees every crossing.", body: "Every scan, every direction, kept." },
  { title: "The pass remembers every promise.", body: "Approvals leave a trail you can read." },
  { title: "The night listens for anything out of place.", body: "Alerts surface quietly, before they grow." },
];

const HERO = "Every gate remembers everyone who passed.";
const HERO_WORDS = HERO.split(" ");

export function LandingPage() {
  const t = useAtmosphereTheme("campus");
  const reduce = useReducedMotion();
  const greeting = useTimeGreeting();
  const router = useRouter();

  useEffect(() => {
    if (reduce) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLAnchorElement ||
        el instanceof HTMLButtonElement
      )
        return;
      router.push("/login");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reduce, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070B14] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: t.vignette }}
      />
      <ParticleField color={t.accent} />
      <AmbientGlow color={t.glow} />
      <CursorHalo />
      <Fireflies />

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
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
            }}
            className="max-w-2xl text-3xl font-light tracking-tight md:text-5xl"
          >
            {HERO_WORDS.map((w, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: DURATION.card, ease: EASE.gentle },
                  },
                }}
                className="inline-block"
              >
                {w}
                {i < HERO_WORDS.length - 1 ? "\u00A0" : ""}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-lg text-sm text-white/60 md:text-base"
          >
            The campus breathes. We listen.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                {greeting.label}
              </span>
              <span className="text-[10px] text-white/25">·</span>
              <span className="text-[10px] text-white/35">{greeting.sub}</span>
            </div>
            <LiveStatePill />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-16 w-full">
            <LoginBubbleField />
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-12 text-[10px] uppercase tracking-[0.25em] text-white/25"
          >
            Press ⏎ to enter
          </motion.p>
        </section>

        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-4xl px-6 py-12"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {SIGNALS.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur transition-colors hover:border-white/[0.16]"
              >
                <p className="text-sm font-medium text-white/85">{s.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/45">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        <footer className="relative z-10 px-6 py-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">
            {t.microcopy.footer}
          </p>
          <p className="mt-2 text-[10px] text-white/15">
            <Link href="/about" className="hover:text-white/40">
              About
            </Link>
            <span className="mx-2">·</span>
            <Link href="/help" className="hover:text-white/40">
              Help
            </Link>
            <span className="mx-2">·</span>
            <Link href="/support" className="hover:text-white/40">
              Support
            </Link>
          </p>
        </footer>
      </motion.div>
    </main>
  );
}
