"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useFocusPull } from "../../motion/useFocusPull";

/**
 * AccessFlow — a horizontal SVG pipeline (A): Request → Approve → Scan →
 * Verify → Audit.
 *
 * Two overlapping <path> elements share the same `d`:
 *   1. a static grey "track" path
 *   2. a motion.path whose pathLength is scroll-linked 0 → 1
 *
 * The container's scroll progress drives pathLength, so the line "draws"
 * as the user scrolls the section into view. Step labels fade in,
 * staggered. The section title uses useFocusPull (E).
 *
 * Reduced motion / low tier: the path is rendered at pathLength 1 (full)
 * with no scroll link.
 */

const STEPS = [
  { label: "Request", body: "Student raises a pass in one tap." },
  { label: "Approve", body: "Warden or principal signs digitally." },
  { label: "Scan", body: "Operator scans at the gate." },
  { label: "Verify", body: "Identity + permission checked in real time." },
  { label: "Audit", body: "Every move is logged, immutable." },
];

// A gentle 5-segment wavy path across the full width.
const PATH_D =
  "M 20 60 C 120 20, 220 100, 320 60 S 520 20, 620 60";

export function AccessFlow() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const { letterSpacing, filter } = useFocusPull(titleRef);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.75", "end 0.6"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={containerRef}
      id="home-access-flow"
      aria-label="Access flow"
      className="mx-auto w-full max-w-5xl px-6 py-16"
    >
      <h2
        ref={titleRef}
        className="text-center text-3xl font-bold md:text-4xl"
        style={
          reduced
            ? undefined
            : { letterSpacing, filter, transition: "letter-spacing 500ms ease, filter 500ms ease" }
        }
      >
        How a pass moves through the campus
      </h2>

      <div className="relative mt-12">
        <svg
          viewBox="0 0 640 120"
          className="mx-auto w-full"
          role="img"
          aria-label="Access flow pipeline"
        >
          {/* 1. Static grey track */}
          <path
            d={PATH_D}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          {/* 2. Scroll-linked draw path */}
          <motion.path
            d={PATH_D}
            fill="none"
            stroke="var(--home-accent-gold,#FBBF24)"
            strokeWidth={4}
            strokeLinecap="round"
            style={reduced ? { pathLength: 1 } : { pathLength }}
          />
        </svg>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[var(--home-border-hard,rgba(255,255,255,0.18))] bg-[var(--home-bg-elev-1,#0F172A)] text-sm font-bold text-[var(--home-accent-gold,#FBBF24)]">
                {i + 1}
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--home-text-primary,#F3F4F6)]">
                {s.label}
              </h3>
              <p className="mt-1 text-xs text-[var(--home-text-muted,#6B7280)]">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
