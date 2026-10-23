"use client";

import { useRef } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import { useStickyPreview } from "../../motion/useStickyPreview";

/**
 * Modules — 8 module cards + a sticky preview panel (technique B).
 *
 * The preview panel is `position: sticky; top: 80px`. As the user scrolls
 * the card list, `useStickyPreview` returns the index of the card whose
 * center is nearest the "hot zone" (~40% viewport height). When the
 * active index changes, the preview panel's inner content swaps using a
 * shared `layoutId` so it morphs rather than crossfades.
 *
 * The cards themselves are matte — no glass. The gloss lives in the
 * background. Card enter is a stagger. No scroll-jacking, no
 * scroll-snap.
 *
 * Reduced motion: the layoutId morph is disabled; the panel swaps
 * instantly.
 */

interface ModuleDef {
  id: string;
  title: string;
  copy: string;
}

const MODULES: ModuleDef[] = [
  {
    id: "gates",
    title: "Gates",
    copy: "Real-time IN/OUT at every gate, with geo-fencing and scan verification.",
  },
  {
    id: "permissions",
    title: "Permissions",
    copy: "Multi-stage outpass, exam and memo workflows with SLA timers.",
  },
  {
    id: "hostel",
    title: "Hostel",
    copy: "Block occupancy, room allocation, outpass approval and curfew.",
  },
  {
    id: "mess",
    title: "Mess",
    copy: "Meal preferences, token scanning and no-show detection.",
  },
  {
    id: "exams",
    title: "Exams",
    copy: "Exam-day access state, candidate attendance and hall tickets.",
  },
  {
    id: "complaints",
    title: "Complaints",
    copy: "Taxonomy-driven routing with statutory escalation chains.",
  },
  {
    id: "analytics",
    title: "Analytics",
    copy: "Traffic, occupancy, sustainability and predictive modelling.",
  },
  {
    id: "audit",
    title: "Audit",
    copy: "Immutable event trail with full-text search and export.",
  },
];

export function Modules() {
  const reduced = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const activeIndex = useStickyPreview(
    containerRef,
    cardRefs,
    { hotZone: 0.4 },
  );
  const active = MODULES[activeIndex] ?? MODULES[0];

  return (
    <section
      ref={containerRef}
      aria-label="Modules"
      className="mx-auto w-full max-w-6xl px-6 py-16"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold md:text-4xl">
          Eight modules, one system
        </h2>
        <p className="mt-2 text-[var(--home-text-secondary,#9CA3AF)]">
          Every service on campus, connected by a single permission model.
        </p>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {/* Sticky preview panel. No glass — matte surface. The gloss is
            in the fixed background behind it. */}
        <div className="hidden md:block">
          <div className="sticky top-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                layoutId={reduced ? undefined : `module-preview-${active.id}`}
                layout="position"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={reduced ? undefined : { opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="rounded-3xl border border-[var(--home-border-soft,rgba(255,255,255,0.08))] bg-[var(--home-bg-elev-1,#0F172A)] p-10"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--home-text-muted,#6B7280)]">
                  Module {String(activeIndex + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-[var(--home-text-primary,#F3F4F6)]">
                  {active.title}
                </h3>
                <p className="mt-3 text-[var(--home-text-secondary,#9CA3AF)]">
                  {active.copy}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Scroll list */}
        <ol className="space-y-4">
          {MODULES.map((m, i) => (
            <motion.li
              key={m.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className={
                "rounded-2xl border p-6 transition-colors " +
                (i === activeIndex
                  ? "border-[var(--home-accent-gold,#FBBF24)] bg-[var(--home-bg-elev-1,#0F172A)]"
                  : "border-[var(--home-border-soft,rgba(255,255,255,0.08))]")
              }
            >
              <span className="text-xs text-[var(--home-text-muted,#6B7280)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 font-semibold text-[var(--home-text-primary,#F3F4F6)]">
                {m.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--home-text-muted,#6B7280)]">
                {m.copy}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
