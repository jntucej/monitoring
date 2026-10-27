"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

/**
 * TrustBand — deliberately quiet. No gloss, no tilt. Simple fade-in on
 * view. This is the visual rest between the two glossy neighbours
 * (Modules above, NumbersBand below).
 *
 * Content: uptime, immutable audit log, session invalidation, RBAC, data
 * residency.
 */

const PILLARS = [
  {
    title: "Immutable audit log",
    copy: "Every state change is an append-only event with actor, timestamp and diff.",
  },
  {
    title: "Session invalidation",
    copy: "One click bumps a per-user session version — every token goes stale instantly.",
  },
  {
    title: "Row-level security",
    copy: "Hostel, department and branch scoping enforced in Postgres, not just the UI.",
  },
  {
    title: "Data residency",
    copy: "All data stays on your infrastructure — no third-party analytics by default.",
  },
];

export function TrustBand() {
  const reduced = useReducedMotion();
  return (
    <section
      aria-label="Trust and security"
      className="mx-auto w-full max-w-6xl px-6 py-16"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold md:text-4xl">
          Built for institutions, not demos
        </h2>
        <p className="mt-2 text-[var(--home-text-secondary,#9CA3AF)]">
          The guarantees that keep a campus honest.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PILLARS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="border-l-2 border-[var(--home-accent-mint,#10B981)] pl-5"
          >
            <h3 className="font-semibold text-[var(--home-text-primary,#F3F4F6)]">
              {p.title}
            </h3>
            <p className="mt-1 text-sm text-[var(--home-text-muted,#6B7280)]">
              {p.copy}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
