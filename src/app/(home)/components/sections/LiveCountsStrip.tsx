"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { useLiveData } from "../hooks/useLiveData";
import { RollingDigits } from "./RollingDigits";

/**
 * LiveCountsStrip — the thin live-stat strip that SITS BELOW THE HERO.
 *
 * This is where the page's single glass depth pane begins. The pane is an
 * absolutely-positioned, inset-0 div behind the strip carrying the ONLY
 * `backdrop-filter` on the whole page. The strip itself has NO
 * backdrop-filter.
 *
 * Every number goes through `RollingDigits` (useDigitRoll D). Reveal is a
 * simple whileInView fade + y.
 *
 * Data: `useLiveData` — onCampusNow, scansToday, requestsToday,
 * approvedToday. Numbers the strip shows: on campus, scans today,
 * active gates (derived from modules), uptime (static 99.9% label).
 */

export function LiveCountsStrip() {
  const reduced = useReducedMotion();
  const live = useLiveData(30_000);
  const s = live?.stats;

  // The live endpoint now returns ONLY the four aggregate counters
  // (requests/approved/scans today + on-campus now); the richer payload
  // (modules/requests/scans) was stripped for security. Guard against a
  // missing `modules` array so the strip never throws and the
  // WidgetBoundary never reports "Widget failed to load".
  const activeGates =
    live?.modules?.filter((m) => m.id === "gate").length ?? 0;

  const items = [
    { label: "On campus now", value: s?.onCampusNow ?? 0 },
    { label: "Scans today", value: s?.scansToday ?? 0 },
    { label: "Active gates", value: activeGates },
    { label: "Uptime", value: 99 },
    { label: "Uptime suffix", value: 9 }, // the "9" after the dot
  ];

  return (
    <section
      aria-label="Live campus statistics"
      className="home-live-strip relative mx-auto mt-12 w-full max-w-6xl px-6"
    >
      {/* The single glass depth pane on the page. It sits BEHIND the strip
          (z-0) and is the ONLY backdrop-filter on the home page. It starts
          below the hero and is sized to the strip container, not the whole
          viewport. */}
      <div className="home-glass-pane pointer-events-none absolute inset-x-0 -top-4 bottom-4 z-0 rounded-3xl" />
      <motion.div
        className="home-viewfinder relative z-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--home-border-soft,rgba(255,255,255,0.08))] md:grid-cols-5"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {items.slice(0, 4).map((it, idx) => (
          <div key={it.label} className="bg-[var(--home-bg-elev-1,#0F172A)]/90 px-5 py-6 text-center">
            <p className="flex items-center justify-center gap-2 text-3xl font-bold text-[var(--home-text-primary,#FFFFFF)] md:text-4xl">
              {/* ARCHWAY: mint = on-campus/active (entry), rose = scans (activity),
                  gold = uptime. A small glowing dot next to each number. */}
              <span
                className={`home-dot ${
                  it.label === "On campus now"
                    ? "home-dot-mint"
                    : it.label === "Scans today"
                      ? "home-dot-rose"
                      : "home-dot-gold"
                }`}
                aria-hidden="true"
              />
              <RollingDigits value={it.value} cellHeight={44} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-[var(--home-text-muted,#94A3B8)]">
              {it.label}
            </p>
          </div>
        ))}
        <div className="col-span-2 bg-[var(--home-bg-elev-1,#0F172A)]/90 px-5 py-6 text-center md:col-span-1">
          <p className="text-3xl font-bold text-[var(--home-text-primary,#F3F4F6)] md:text-4xl">
            <RollingDigits value={items[3].value} cellHeight={44} />
            <span className="text-[var(--home-text-muted,#6B7280)]">.</span>
            <RollingDigits value={items[4].value} cellHeight={44} />
            <span className="text-[var(--home-text-muted,#6B7280)]">%</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-[var(--home-text-muted,#6B7280)]">
            Uptime
          </p>
        </div>
      </motion.div>
    </section>
  );
}
