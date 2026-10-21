"use client";

import { Suspense, lazy, useState, useEffect } from "react";

/**
 * Cinematic motion layer for the home page.
 *
 * Loaded lazily (next/dynamic ssr:false) so the framer-motion scene
 * components do not enter the first-load JS budget. The lean SSR shell
 * (Hero + sections) paints immediately; the cinematic layer mounts
 * after first paint and layers Preloader / BackgroundField /
 * HowItWorksMotion on top.
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
const HowItWorksMotion = lazy(() =>
  import("./motion/HowItWorksMotion").then((m) => ({
    default: m.HowItWorksMotion,
  })),
);
const Reveal = lazy(() =>
  import("./motion/Reveal").then((m) => ({ default: m.Reveal })),
);

export function HomeMotionLayer() {
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
      <Reveal as="section" className="mx-auto max-w-4xl px-6">
        <HowItWorksMotion />
      </Reveal>
    </Suspense>
  );
}
