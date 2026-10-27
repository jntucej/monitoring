"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { useFocusPull } from "../../motion/useFocusPull";
import { useLiveData } from "../hooks/useLiveData";
import { RollingDigits } from "./RollingDigits";

/**
 * NumbersBand — platform-scale counters: gates monitored, users on
 * platform, scans processed, uptime %.
 *
 * "scans processed" and "gates monitored" read LIVE values via
 * useLiveData so this band can never show a different number than
 * LiveCountsStrip higher up the same page. "users on platform" and
 * "uptime" are static platform framing (clearly cumulative, not
 * current-second), so they stay hardcoded marketing copy.
 *
 * Every counter goes through `RollingDigits` (useDigitRoll D). The
 * section title uses useFocusPull (E).
 */

export function NumbersBand() {
  const reduced = useReducedMotion();
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const { letterSpacing, filter } = useFocusPull(titleRef);
  const live = useLiveData(30_000);
  const s = live?.stats;

  const activeGates =
    live?.modules?.find((m) => m.id === "gate")?.count ?? 0;

  const NUMBERS: Array<{ value: number; suffix: string; label: string }> = [
    { value: activeGates, suffix: "", label: "gates monitored" },
    { value: 3100, suffix: "+", label: "users on platform" },
    { value: s?.scansToday ?? 0, suffix: "", label: "scans processed today" },
    { value: 99, suffix: "%", label: "uptime" },
  ];

  return (
    <section
      aria-label="Campus numbers"
      className="mx-auto w-full max-w-6xl px-6 py-16"
    >
      <h2
        ref={titleRef}
        className="text-center text-3xl font-bold md:text-4xl"
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
        Quietly handling the whole campus
      </h2>
      <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
        {NUMBERS.map((n, i) => (
          <motion.div
            key={n.label}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="text-center"
          >
            <p className="text-4xl font-bold text-[var(--home-text-primary,#F3F4F6)] md:text-5xl">
              <RollingDigits value={n.value} cellHeight={52} />
              {n.suffix && (
                <span className="text-2xl text-[var(--home-text-muted,#6B7280)]">
                  {n.suffix}
                </span>
              )}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wider text-[var(--home-text-muted,#6B7280)]">
              {n.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
