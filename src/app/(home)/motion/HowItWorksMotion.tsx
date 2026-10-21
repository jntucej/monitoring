"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

const STEPS = [
  { n: 1, title: "Request", body: "Student raises a pass in one tap." },
  { n: 2, title: "Approve", body: "Warden or principal signs digitally." },
  { n: 3, title: "Scan", body: "Operator scans at the gate." },
  { n: 4, title: "Record", body: "Every move is audited in real time." },
];

export function HowItWorksMotion() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "center 40%"],
  });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} className="relative mx-auto max-w-5xl px-6 py-24">
      <h2 className="text-center text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">
        How campus access works
      </h2>
      <div className="relative mt-14">
        <div className="absolute left-6 right-6 top-5 h-[2px] bg-[var(--border)]" />
        <motion.div
          className="absolute left-6 right-6 top-5 h-[2px] origin-left bg-[var(--action-primary)]"
          style={{ width: reduced ? "100%" : width }}
        />
        <ol className="relative grid grid-cols-2 gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.85 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.15 + 0.1,
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--action-primary)] bg-[var(--bg-surface)] font-semibold text-[var(--action-primary)]"
              >
                {s.n}
              </motion.div>
              <div className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                {s.title}
              </div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {s.body}
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
