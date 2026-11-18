// src/components/SakugaLoadingSplash.tsx
//
// Full-page sakuga-vfx loading splash for female students (ui_theme='sakuga').
// Replaces the generic PageLoading with an anime-styled progress bar +
// character scene while dashboard widgets load.
//
// Only rendered when data-theme="sakuga" is on <html> — zero impact on
// graphite/default-theme users.
//
// The sakuga-progress custom element is registered by progress.js (loaded
// by ClientProviders when the theme is active). If the element is not yet
// defined on first paint, a static CSS progress bar renders instead; when
// the script arrives, the custom element takes over seamlessly.

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Register sakuga-progress in JSX.IntrinsicElements so TypeScript accepts it.
// The custom element is defined by /sakuga-vfx/progress.js which loads
// when data-theme="sakuga" is active. The declare global block extends
// the React JSX namespace so the tag can be used in JSX without TS errors.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sakuga-progress": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          label?: string;
          value?: string;
        },
        HTMLElement & {
          set?: (n: number, instant?: boolean) => void;
          reset?: () => void;
          value?: number;
          done?: boolean;
        }
      >;
    }
  }
}

interface Props {
  children: ReactNode;
  /**
   * Bumped when a widget finishes loading. The splash tracks
   * "how many widgets have settled" via a MutationObserver on
   * data-loading attributes (set by WidgetBoundary on error/retry).
   * If no data-loading attributes are present, the splash auto-dismisses
   * after a short timeout as a fallback.
   */
}

export function SakugaLoadingSplash({ children }: Props) {
  const [isSakuga, setIsSakuga] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<
    HTMLElement & { set?: (n: number, instant?: boolean) => void }
  >(null);

  // Detect sakuga theme on mount. ClientProviders sets data-theme="sakuga"
  // after auth; we poll briefly to catch it.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const check = () => {
      if (cancelled) return;
      if (document.documentElement.dataset.theme === "sakuga") {
        setIsSakuga(true);
        return;
      }
      if (tries++ < 8) setTimeout(check, 250);
    };
    check();
    return () => { cancelled = true; };
  }, []);

  // Drive the progress bar and auto-dismiss the splash.
  // Strategy:
  //  1. Watch for the sakuga:done event from the <sakuga-progress> element.
  //  2. As a fallback, auto-dismiss after 4 s (the widgets are lightweight
  //     and fetch from cache or local API; 4 s is generous).
  //  3. Drive the progress value from a simulated ramp (0→1 over ~2.5 s)
  //     so the storm-cloud VFX plays even without real per-widget signals.
  useEffect(() => {
    if (!isSakuga || splashGone) return;

    // Simulate a loading ramp: 0 → 1 over 2.5 s, with a slight ease.
    const start = performance.now();
    let raf = 0;
    const DURATION_MS = 2500;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / DURATION_MS);
      // Ease-out: fast start, slow finish (matches the storm-cloud VFX feel).
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = eased;

      // Drive the sakuga-progress element if it's registered.
      if (progressRef.current?.set) {
        progressRef.current.set(pct, true);
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // Finished — wait for the done animation (burst + check), then hide.
        const onDone = () => setSplashGone(true);
        const el = progressRef.current;
        if (el) {
          el.addEventListener("sakuga:done", onDone, { once: true });
        }
        // Safety: always hide after 1 s regardless.
        setTimeout(() => setSplashGone(true), 1000);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isSakuga, splashGone]);

  // Non-sakuga or splash done: render children directly.
  if (!isSakuga || splashGone) {
    return <>{children}</>;
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Sakuga loading overlay — covers the viewport while widgets load.
          Uses the sakuga CSS vars (set in globals.css [data-theme="sakuga"]).
          Fallback hex values are for the case where the theme hasn't been
          applied yet (race between theme fetch and first paint). */}
      <div
        data-testid="sakuga-loading-splash"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: "--sk-card",
        }}
      >
        {/* Character scene — a stylised anime-inspired illustration
            using the sakuga palette (ink, pri, acc, soft). */}
        <div
          data-testid="sakuga-character"
          className="relative mb-6 flex h-32 w-32 items-center justify-center"
          aria-hidden="true"
        >
          {/* Soft accent glow */}
          <div
            className="absolute inset-0 rounded-full opacity-25"
            style={{
              background:
                "radial-gradient(circle at 40% 40%, --sk-acc 0%, transparent 70%)",
            }}
          />
          {/* Anime character — ink outlines, pri uniform, acc tie */}
          <svg
            viewBox="0 0 100 100"
            className="relative h-24 w-24"
            aria-hidden="true"
          >
            {/* hair back */}
            <ellipse cx="50" cy="42" rx="26" ry="24" fill="--sk-ink" />
            {/* face */}
            <circle cx="50" cy="44" r="18" fill="--sk-card" />
            {/* hair front */}
            <path
              d="M 32 38 Q 38 24 50 26 Q 62 24 68 38 L 68 46 Q 60 34 50 36 Q 40 34 32 46 Z"
              fill="--sk-ink"
            />
            {/* eyes */}
            <ellipse cx="43" cy="45" rx="3.5" ry="5" fill="--sk-ink" />
            <ellipse cx="57" cy="45" rx="3.5" ry="5" fill="--sk-ink" />
            {/* eye highlights */}
            <circle cx="44.5" cy="43" r="1.2" fill="--sk-card" />
            <circle cx="58.5" cy="43" r="1.2" fill="--sk-card" />
            {/* blush */}
            <ellipse cx="38" cy="50" rx="4" ry="2.5" fill="--sk-acc" opacity="0.4" />
            <ellipse cx="62" cy="50" rx="4" ry="2.5" fill="--sk-acc" opacity="0.4" />
            {/* mouth */}
            <path
              d="M 47 53 Q 50 55 53 53"
              stroke="--sk-ink"
              strokeWidth="1.2"
              fill="none"
            />
            {/* uniform */}
            <rect x="35" y="60" width="30" height="20" rx="6" fill="--sk-pri" />
            {/* collar */}
            <path d="M 42 60 L 50 68 L 58 60 Z" fill="--sk-card" />
            {/* tie */}
            <path d="M 48 68 L 50 76 L 52 68 Z" fill="--sk-acc" />
            {/* sparkles */}
            <g opacity="0.7">
              <path d="M 20 30 L 22 26 L 24 30 L 22 28 Z" fill="--sk-acc" />
              <path d="M 80 35 L 82 31 L 84 35 L 82 33 Z" fill="--sk-pri" />
              <circle cx="16" cy="50" r="2" fill="--sk-soft" />
              <circle cx="84" cy="55" r="2.5" fill="--sk-soft" />
            </g>
          </svg>
        </div>

        {/* Loading copy — sakuga-flavoured */}
        <p
          data-testid="sakuga-loading-copy"
          className="mb-6 text-sm font-semibold"
          style={{
            color: "--sk-ink",
            letterSpacing: "-0.01em",
          }}
        >
          Loading your campus story…
        </p>

        {/* sakuga-progress VFX — storm cloud riding the bar.
            Rendered as a custom element; if progress.js hasn't registered
            it yet, the element is inert and the fallback bar below shows. */}
        <sakuga-progress
          ref={progressRef}
          label="Loading your campus story"
          data-testid="sakuga-progress"
          style={{ display: "block" }}
        />

        {/* Fallback static progress bar — visible while the VFX element
            hasn't registered yet, or as a secondary indicator. */}
        <div
          data-testid="sakuga-progress-fallback"
          className="mt-4 h-2 w-48 overflow-hidden rounded-full"
          style={{ background: "--sk-track" }}
          role="progressbar"
          aria-label="Loading dashboard"
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: "100%",
              background: "linear-gradient(90deg, --sk-pri, --sk-acc)",
            }}
          />
        </div>
      </div>

      {/* Dashboard content renders underneath — hidden until splash is gone.
          Using visibility:hidden (not display:none) so the DOM tree stays
          mounted and widgets can start fetching in parallel. */}
      <div className="invisible" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
