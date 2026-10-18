"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ParticleField,
  AmbientGlow,
  BreathingVignette,
  HorizonGlow,
  FilmGrain,
  CursorHalo,
  Fireflies,
  CinematicLoader,
  useAtmosphereTheme,
  useTimeGreeting,
  fadeIn,
  fadeUp,
  slideUp,
  DURATION,
  EASE,
} from "@/components/cinematic";
import { LoginBubbleField } from "./LoginBubbleField";
import { LiveStatePill } from "./LiveStatePill";
import { Chapter } from "./Chapter";
import { NarrativeProgress } from "./NarrativeProgress";
import { ScrollHint } from "./ScrollHint";
import { useBootSequence } from "./useBootSequence";
import {
  GateVisual,
  ScanVisual,
  PassVisual,
  ApprovalVisual,
  ReturnVisual,
  QuietVisual,
} from "./NarrativeVisuals";

const HERO = "Every gate remembers everyone who passed.";
const SUB =
  "The campus access instrument for JNTUCEJ — every crossing, every pass, every quiet signal, kept.";

const CHAPTERS = [
  {
    id: "ch-gate",
    index: 1,
    poetic: "Every gate remembers everyone who passed.",
    plain:
      "When you step onto campus, the gate records the crossing — one line in a quiet ledger that never forgets.",
    Visual: GateVisual,
  },
  {
    id: "ch-scan",
    index: 2,
    poetic: "A single card. A single second.",
    plain:
      "You show your ID. The operator's desk reads it, records the direction, and puts you inside — no paperwork, no waiting.",
    Visual: ScanVisual,
  },
  {
    id: "ch-pass",
    index: 3,
    poetic: "When you need to leave, the pass travels ahead of you.",
    plain:
      "Students, faculty, and hostel residents request permission here. The request moves through the right hands — class teacher, warden, principal — in the right order.",
    Visual: PassVisual,
  },
  {
    id: "ch-approval",
    index: 4,
    poetic: "A yes is kept. Signed. Hashed. Unalterable.",
    plain:
      "Every approval is digitally signed and stored with a tamper-evident hash. Nobody can change a decision after the fact — not even the person who made it.",
    Visual: ApprovalVisual,
  },
  {
    id: "ch-return",
    index: 5,
    poetic: "You come back. The gate remembers that too.",
    plain:
      "When you re-enter campus, the pass closes, the curfew score updates, and your parents see a quiet line: safely back.",
    Visual: ReturnVisual,
  },
  {
    id: "ch-quiet",
    index: 6,
    poetic: "When nothing happens, the instrument is still listening.",
    plain:
      "Overnight, the systems watch for what shouldn't happen — an unusual gate, a pass that never returned, a batch of failed logins. Silence is not absence. It is attention.",
    Visual: QuietVisual,
  },
];

export function LandingPage() {
  const t = useAtmosphereTheme("campus");
  const reduce = useReducedMotion();
  const greeting = useTimeGreeting();
  const router = useRouter();
  const booted = useBootSequence();
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [narrativeInView, setNarrativeInView] = useState(false);
  const narrativeRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNarrativeInView(!!entry?.isIntersecting),
      { rootMargin: "-30% 0px -30% 0px" },
    );
    observer.observe(el);
  }, []);

  // Enter → /login (skip when a focusable element is active)
  useEffect(() => {
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
  }, [router]);

  // Track active chapter
  useEffect(() => {
    const els = document.querySelectorAll("[data-chapter-index]");
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const idx = parseInt(
            visible[0].target.getAttribute("data-chapter-index") || "1",
            10,
          );
          setActiveChapterIdx(idx - 1);
        }
      },
      { threshold: [0.3, 0.5, 0.7], rootMargin: "-20% 0px -20% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const jumpTo = useCallback((idx: number) => {
    document.getElementById(CHAPTERS[idx]?.id)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  const heroAnimate = booted ? "show" : "hidden";

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[#070B14] text-white">
        {/* atmosphere */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: t.vignette }}
        />
        <BreathingVignette glow={t.glow} />
        <ParticleField color={t.accent} />
        <AmbientGlow color={t.glow} />
        <HorizonGlow accent={t.accent} />
        <CursorHalo />
        <FilmGrain />
        <Fireflies />

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* ══════════════════════════════════════════════════════════
              SCREEN 1 · THE DOOR — sign in first, everything else
              ══════════════════════════════════════════════════════════ */}
          <section
            aria-labelledby="hero-heading"
            className="flex min-h-screen flex-col items-center justify-center px-6 pb-20 pt-20 text-center"
          >
            <motion.p
              variants={fadeIn}
              initial={reduce ? false : "hidden"}
              animate={heroAnimate}
              className="mb-6 text-sm uppercase tracking-[0.28em] text-white/55"
            >
              Campus Access · Gate Monitor for JNTUCEJ
            </motion.p>

            <div className="overflow-hidden">
              <motion.h1
                id="hero-heading"
                variants={slideUp}
                initial={reduce ? false : "hidden"}
                animate={heroAnimate}
                transition={{ delay: 0.1 }}
                className="max-w-3xl text-balance text-4xl font-light leading-tight tracking-tight md:text-6xl"
              >
                {HERO}
              </motion.h1>
            </div>

            <motion.p
              variants={fadeUp}
              initial={reduce ? false : "hidden"}
              animate={heroAnimate}
              transition={{ delay: 0.3 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
            >
              {SUB}
            </motion.p>

            {/* Ambient status — small, does not compete with the bubble */}
            <motion.div
              variants={fadeUp}
              initial={reduce ? false : "hidden"}
              animate={heroAnimate}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur">
                <span className="text-xs uppercase tracking-[0.18em] text-white/65">
                  {greeting.label}
                </span>
                <span className="text-xs text-white/35">·</span>
                <span className="text-xs text-white/55">{greeting.sub}</span>
              </div>
              <LiveStatePill />
            </motion.div>

            {/* ── THE DOOR — Sign In bubble is the focal point ── */}
            <motion.div
              variants={fadeUp}
              initial={reduce ? false : "hidden"}
              animate={heroAnimate}
              transition={{ delay: 0.8 }}
              className="mt-20 w-full"
            >
              <LoginBubbleField />
            </motion.div>

            <motion.p
              variants={fadeIn}
              initial={reduce ? false : "hidden"}
              animate={heroAnimate}
              transition={{ delay: 1.2 }}
              className="mt-14 text-sm text-white/55"
            >
              Press{" "}
              <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white/80">
                Enter
              </kbd>{" "}
              to sign in
            </motion.p>
          </section>

          {/* ══════════════════════════════════════════════════════════
              TRANSITION — explicit "how it works" cue
              ══════════════════════════════════════════════════════════ */}
          <ScrollHint />

          {/* ══════════════════════════════════════════════════════════
              THE STORY — 6 chapters
              ══════════════════════════════════════════════════════════ */}
          <div ref={narrativeRef} className="relative">
            {CHAPTERS.map(({ Visual, ...c }) => (
              <Chapter
                key={c.id}
                id={c.id}
                index={c.index}
                poetic={c.poetic}
                plain={c.plain}
                visual={(active) => <Visual active={active} accent={t.accent} />}
                isActive={activeChapterIdx === c.index - 1}
              />
            ))}
          </div>

          <NarrativeProgress
            total={CHAPTERS.length}
            activeIndex={activeChapterIdx}
            onJump={jumpTo}
            visible={narrativeInView}
          />

          {/* ══════════════════════════════════════════════════════════
              QUIET CLOSE — text only, no competing bubble
              ══════════════════════════════════════════════════════════ */}
          <motion.section
            aria-labelledby="cta-heading"
            initial={reduce ? false : { opacity: 0.6, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: DURATION.card, ease: EASE.gentle }}
            className="relative flex flex-col items-center px-6 py-28 text-center"
          >
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-white/45">
              The gate is waiting
            </p>
            <h2
              id="cta-heading"
              className="max-w-xl text-balance text-2xl font-light leading-snug text-white md:text-3xl"
            >
              You&apos;ve seen how it works.
            </h2>
            <Link
              href="/login"
              className="mt-8 text-sm text-white/70 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-4 focus-visible:ring-offset-[#070B14]"
            >
              Sign in when you&apos;re ready →
            </Link>
            <Link
              href="#hero-heading"
              className="mt-6 text-xs text-white/35 transition hover:text-white/60"
            >
              ← Back to the door
            </Link>
          </motion.section>

          {/* FOOTER */}
          <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8 text-center">
            <nav
              aria-label="Footer"
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            >
              <Link
                href="/about"
                className="text-sm text-white/65 transition hover:text-white"
              >
                About
              </Link>
              <Link
                href="/help"
                className="text-sm text-white/65 transition hover:text-white"
              >
                Help
              </Link>
              <Link
                href="/support"
                className="text-sm text-white/65 transition hover:text-white"
              >
                Support
              </Link>
              <Link
                href="/login"
                className="text-sm text-white/65 transition hover:text-white"
              >
                Sign in
              </Link>
            </nav>
            <p className="mt-4 text-xs uppercase tracking-[0.28em] text-white/35">
              {t.microcopy.footer}
            </p>
          </footer>
        </div>
      </main>

      {/* Boot overlay — once per tab */}
      <AnimatePresence>
        {!booted && !reduce && (
          <motion.div
            key="boot"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE.gentle }}
            className="fixed inset-0 z-[100]"
          >
            <CinematicLoader mode="welcoming" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
