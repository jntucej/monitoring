"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { useFocusPull } from "../../motion/useFocusPull";
import { RollingDigits } from "./RollingDigits";

/**
 * NumbersBand — counters: gates monitored, users managed, scans
 * processed, uptime %.
 *
 * Every counter goes through `RollingDigits` (useDigitRoll D). The
 * section title uses useFocusPull (E).
 */

const NUMBERS = [
  { value: 12, suffix: "", label: "gates monitored" },
  { value: 3100, suffix: "+", label: "users managed" },
  { value: 847, suffix: "", label: "scans today" },
  { value: 99, suffix: "%", label: "uptime" },
];

export function NumbersBand() {
  const reduced = useReducedMotion();
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const { letterSpacing, filter } = useFocusPull(titleRef);

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
