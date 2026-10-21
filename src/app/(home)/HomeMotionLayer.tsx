"use client";

import { Suspense, lazy, useState, useEffect } from "react";

/**
 * Cinematic motion layer for the home page.
 *
 * Loaded lazily (next/dynamic ssr:false) so the 14 framer-motion scene
 * components do not enter the first-load JS budget. The lean SSR shell
 * (Hero + LiveStatsStrip + role cards) paints immediately; the cinematic
 * layer mounts after first paint and layers Preloader / BackgroundField /
 * LiveGateFeed / HowItWorksMotion / FAQAccordion on top.
 */

const Preloader = lazy(() =>
  import("./motion/Preloader").then((m) => ({ default: m.Preloader })),
);
const BackgroundField = lazy(() =>
  import("./motion/BackgroundField").then((m) => ({
    default: m.BackgroundField,
  })),
);
const ScrollProgress = lazy(() =>
  import("./motion/ScrollProgress").then((m) => ({
    default: m.ScrollProgress,
  })),
);
const LiveGateFeed = lazy(() =>
  import("./motion/LiveGateFeed").then((m) => ({ default: m.LiveGateFeed })),
);
const HowItWorksMotion = lazy(() =>
  import("./motion/HowItWorksMotion").then((m) => ({
    default: m.HowItWorksMotion,
  })),
);
const FAQAccordion = lazy(() =>
  import("./motion/FAQAccordion").then((m) => ({ default: m.FAQAccordion })),
);
const Reveal = lazy(() =>
  import("./motion/Reveal").then((m) => ({ default: m.Reveal })),
);

export interface HomeFaq {
  q: string;
  a: string;
}

export function HomeMotionLayer({
  faqItems,
}: {
  faqItems: HomeFaq[];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Mount the cinematic layer shortly after first paint so it never
    // competes with the lean shell for initial hydration.
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <Preloader />
      <BackgroundField />
      <ScrollProgress />
      <Reveal className="mx-auto mt-16 flex max-w-6xl items-center justify-center px-6">
        <LiveGateFeed />
      </Reveal>
      <HowItWorksMotion />
      <Reveal as="section" delay={0.05} className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-8 text-center text-2xl font-semibold md:text-3xl">
          Frequently asked questions
        </h2>
        <FAQAccordion items={faqItems} />
      </Reveal>
    </Suspense>
  );
}
