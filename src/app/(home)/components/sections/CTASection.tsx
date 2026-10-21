"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { LogIn } from "lucide-react";
import { COLLEGE } from "@/lib/college-config";
import { MagneticButton } from "../ui/MagneticButton";
import { useFocusPull } from "../../motion/useFocusPull";

/**
 * CTASection — the ONE full-glass panel on the page.
 *
 * Headline + Sign in CTA (MagneticButton F, max 6px pull). Title uses
 * useFocusPull (E). Sits BELOW the fold, so its backdrop-filter is safe.
 *
 * NOTE: the page's single glass pane starts in LiveCountsStrip; this
 * section is the second glass surface and is only shown below the fold
 * where it is GPU-cheap. Low tier: the CSS in home.css kills the blur and
 * uses a flat surface instead.
 */

export function CTASection() {
  const reduced = useReducedMotion();
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const { letterSpacing, filter } = useFocusPull(titleRef);

  return (
    <section
      aria-label="Call to action"
      className="mx-auto w-full max-w-5xl px-6 py-16"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="home-cta-glass relative overflow-hidden rounded-3xl px-8 py-16 text-center md:px-16"
      >
        <div
          ref={titleRef}
          className="text-4xl font-bold md:text-5xl"
          style={
            reduced
              ? undefined
              : {
                  letterSpacing,
                  filter,
                  transition: "letter-spacing 500ms ease, filter 500ms ease",
                }
          }
        >
          Sign in to your campus
        </div>
        <p className="mx-auto mt-4 max-w-lg text-[var(--home-text-secondary,#9CA3AF)]">
          Use the account issued by your department or the administrator.
          {COLLEGE.primaryCTA ? "" : ""}
        </p>
        <div className="mt-8 flex justify-center">
          <MagneticButton
            onClick={() => (window.location.href = "/login")}
            strength={0.05}
            radius={80}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--home-accent-indigo,#6366F1)] px-6 py-3 font-semibold text-white shadow-lg hover:opacity-95"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </MagneticButton>
        </div>
      </motion.div>
    </section>
  );
}
