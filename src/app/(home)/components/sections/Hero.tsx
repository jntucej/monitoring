"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { LogIn, ArrowRight } from "lucide-react";
import { COLLEGE } from "@/lib/college-config";
import { MagneticButton } from "../ui/MagneticButton";
import { useGradientHeadline } from "../../motion/useGradientHeadline";

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
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const headRef = useRef<HTMLSpanElement | null>(null);

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

  // Gradient headline (C). Driven by scroll through the section.
  const gradientBgPos = useGradientHeadline(headRef);

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
        className="mb-3 text-sm uppercase tracking-[0.35em] text-[var(--home-accent-indigo,#6366F1)]"
        initial={reduced ? false : { opacity: 0, filter: "blur(8px)", y: 6 }}
        animate={reduced ? undefined : { opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        {COLLEGE.shortName} · Campus Access
      </motion.p>

      {/* LCP: the h1. Full opacity on the first frame. Transform-only
          wrapper motion. No blur, no opacity animation on the text. */}
      <motion.h1
        className="home-headline-gradient text-6xl font-semibold tracking-tight md:text-8xl"
        style={{ lineHeight: 1, ...(reduced ? {} : { backgroundPosition: gradientBgPos }) }}
        initial={reduced ? false : { y: 8, scale: 1.01 }}
        animate={reduced ? undefined : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <span ref={headRef}>{HEADLINE}</span>
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
          onClick={() => (window.location.href = "/login")}
          strength={0.05}
          radius={80}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--home-accent-indigo,#6366F1)] px-6 py-3 font-semibold text-white shadow-lg hover:opacity-95"
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
