"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { LogIn, ArrowRight } from "lucide-react";
import { COLLEGE } from "@/lib/college-config";
import { MagneticButton } from "../ui/MagneticButton";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";


/**
 * Hero — the LCP-bearing first section.
 *
 * HARD RULES:
 *   - The h1 MUST paint at full opacity on the first frame. No opacity
 *     animation, no blur, no display:none. Only `transform` motion
 *     (y / scale) is applied, and only to the wrapper so the h1 text
 *     itself is server-painted.
 *   - No `backdrop-filter` in this section. The depth glass pane starts
 *     in the LiveCountsStrip below.
 *   - Scroll recede is transform + opacity on the section wrapper (not
 *     the h1 text) so the LCP element is never scaled down as the user
 *     scrolls.
 *   - Low tier: the CSS in home.css nullifies `.home-hero-recede` via
 *     `transform: none !important`, so the recede is a no-op there.
 *   - Reduced motion: all motion is disabled.
 */

const HEADLINE = COLLEGE.shortName; // "JNTUH UCEJ"

export function Hero() {
  const reduced = useReducedMotionSafe();
  const router = useRouter();
  const sectionRef = useRef<HTMLElement | null>(null);

  // Scroll recede on the section wrapper.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.94]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.6]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 20]);
  const springScale = useSpring(scale, { stiffness: 120, damping: 20 });
  const springY = useSpring(y, { stiffness: 120, damping: 20 });

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <motion.section
      ref={sectionRef}
      id="home-hero"
      aria-label="Campus portal hero"
      className="home-hero home-hero-recede relative flex min-h-[88svh] flex-col items-center justify-center px-6 py-16 text-center"
      style={reduced ? undefined : { scale: springScale, opacity, y: springY }}
      initial={reduced ? false : { scale: 1.02, y: 12 }}
      animate={reduced ? undefined : { scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
    >
      {/* Eyebrow. This is NOT the LCP element; a small blur-reveal is
          allowed here. The h1 below is the LCP and stays clean. */}
      <motion.p
        className="mb-3 text-sm uppercase tracking-[0.35em] text-[var(--home-accent-gold,#FBBF24)]"
        initial={reduced ? false : { opacity: 0, filter: "blur(8px)", y: 6 }}
        animate={reduced ? undefined : { opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        {COLLEGE.shortName} · Campus Access
      </motion.p>

      {/* ARCHWAY: the logo mark — the archway + scan line + dots — sits on
          the deep navy canvas with a gold aura and a pulsing scan line. It is
          NOT the LCP (the h1 below is), so a gentle blur-reveal is allowed. */}
      <motion.div
        aria-hidden="true"
        className="home-logo-mark mb-8 flex h-28 w-28 items-center justify-center rounded-2xl border border-[var(--home-border-gold,rgba(251,191,36,0.35))]"
        initial={reduced ? false : { opacity: 0, scale: 0.96, filter: "blur(6px)" }}
        animate={reduced ? undefined : { opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full p-2" role="img">
          {/* Archway */}
          <path
            d="M28 78 V44 a22 22 0 0 1 44 0 V78"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Viewfinder brackets */}
          <path d="M14 30 v-6 h6" fill="none" stroke="var(--home-text-muted,#94A3B8)" strokeWidth="2.5" />
          <path d="M86 30 v-6 h-6" fill="none" stroke="var(--home-text-muted,#94A3B8)" strokeWidth="2.5" />
          <path d="M14 70 v6 h6" fill="none" stroke="var(--home-text-muted,#94A3B8)" strokeWidth="2.5" />
          <path d="M86 70 v6 h-6" fill="none" stroke="var(--home-text-muted,#94A3B8)" strokeWidth="2.5" />
          {/* Gold scan line with pulse */}
          <line x1="24" y1="60" x2="76" y2="60" stroke="var(--home-accent-gold,#FBBF24)" strokeWidth="3" strokeLinecap="round">
            {!reduced && (
              <animate
                attributeName="opacity"
                values="1;0.55;1"
                dur="2.6s"
                repeatCount="indefinite"
              />
            )}
          </line>
          {/* Entry + exit dots */}
          <circle cx="24" cy="60" r="3.5" fill="var(--home-accent-mint,#10B981)" />
          <circle cx="76" cy="60" r="3.5" fill="var(--home-accent-rose,#F43F5E)" />
        </svg>
      </motion.div>

      {/* LCP: the h1. Full opacity on the first frame. Transform-only
          wrapper motion. No blur, no opacity animation on the text. The
          gradient is static (centered) so no repaints happen on scroll. */}
      <motion.h1
        className="home-headline-gradient text-6xl font-semibold tracking-tight md:text-8xl"
        style={{ lineHeight: 1 }}
        initial={reduced ? false : { y: 8, scale: 1.01 }}
        animate={reduced ? undefined : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <span>{HEADLINE}</span>
      </motion.h1>

      {/* Sub-headline — blur-reveal is fine here (not the LCP element). */}
      <motion.p
        className="mt-6 max-w-2xl text-lg text-[var(--home-text-secondary,#9CA3AF)] md:text-xl"
        initial={reduced ? false : { opacity: 0, filter: "blur(8px)", y: 6 }}
        animate={reduced ? undefined : { opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.6, delay: 0.12 }}
      >
        {COLLEGE.portalPurpose}
      </motion.p>

      {/* CTA row */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <MagneticButton
          onClick={() => router.push("/login")}
          strength={0.05}
          radius={80}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--home-accent-gold,#FBBF24)] px-6 py-3 font-semibold text-[var(--home-accent-navy,#0A1128)] shadow-lg hover:opacity-95"
        >
          <LogIn className="h-4 w-4" />
          {COLLEGE.primaryCTA}
        </MagneticButton>
        <button
          type="button"
          onClick={() => scrollTo("home-access-flow")}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--home-border-hard,rgba(255,255,255,0.18))] px-6 py-3 font-semibold text-[var(--home-text-primary,#F3F4F6)] hover:bg-white/5"
        >
          How it works
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.section>
  );
}
