"use client";

// SakugaConsole — a compact "console" strip rendered at the TOP of the student
// home dashboard, ONLY when the active theme is sakuga. It puts the sakuga-VFX
// custom elements to real use on the main dashboard (not just the profile page),
// so the themed "girls' dashboard" visibly demonstrates the anime controls:
// button, tabs, rating, slider, toggle, progress, tooltip.
//
// Graphite users never see it (gated on data-theme === "sakuga"), so it adds
// zero nodes to the non-themed path. If a VFX script fails to register, the
// <sakuga-*> tags degrade to inert shells and the native fallbacks inside keep
// the panel usable.

import { useEffect, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

type SakugaProps = Record<string, unknown> & { children?: ReactNode };
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sakuga-button": SakugaProps;
      "sakuga-tabs": SakugaProps;
      "sakuga-toast": SakugaProps;
      "sakuga-slider": SakugaProps;
      "sakuga-input": SakugaProps;
      "sakuga-rating": SakugaProps;
      "sakuga-tooltip": SakugaProps;
      // (sakuga-progress is declared in SakugaLoadingSplash.tsx with its own
      // set()/value typing — omitted here to avoid a TS2717 tag conflict.)
    }
  }
}

function useIsSakuga(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    let observer: MutationObserver | undefined;
    const read = () => document.documentElement.getAttribute("data-theme") === "sakuga";
    const check = () => {
      setOn(read());
      if (!read() && ++tries < 6) timer = setTimeout(check, 400);
    };
    check();
    observer = new MutationObserver(() => setOn(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);
  return on;
}

export function SakugaConsole() {
  const isSakuga = useIsSakuga();
  const [tab, setTab] = useState<"today" | "passes" | "mess">("today");

  if (!isSakuga) return null;

  return (
    <section
      aria-label="Console (sakuga effects)"
      className="surface-card p-3 md:p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-action-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Console effects
        </p>
        <span className="ml-auto text-xs text-text-muted">anime controls</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Tabs: switch the dashboard focus */}
        <div>
          <p className="mb-1.5 text-xs text-text-muted">Focus</p>
          <sakuga-tabs
            activeTab={tab}
            onChange={((e: unknown) => {
              const v = (e as any).target?.getAttribute?.("value");
              setTab(v === "passes" || v === "mess" ? v : "today");
            }) as any}
          >
            <button type="button" value="today" className="text-xs">Today</button>
            <button type="button" value="passes" className="text-xs">Passes</button>
            <button type="button" value="mess" className="text-xs">Mess</button>
          </sakuga-tabs>
        </div>

        {/* Rating */}
        <div>
          <p className="mb-1.5 text-xs text-text-muted">Mood</p>
          <sakuga-rating value={4} label="mood">★</sakuga-rating>
        </div>

        {/* Slider */}
        <div>
          <p className="mb-1.5 text-xs text-text-muted">Volume</p>
          <sakuga-slider min="0" max="100" value="60" label="volume" unit="%" />
        </div>

        {/* Buttons + tooltip + toast demo */}
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <sakuga-button variant="secondary" label="dismiss">Dismiss</sakuga-button>
            <sakuga-button label="confirm">Confirm</sakuga-button>
          </div>
          <sakuga-tooltip text="Sakuga VFX active ✦">
            <span className="text-xs text-text-muted">hover</span>
          </sakuga-tooltip>
        </div>
      </div>
    </section>
  );
}

export default SakugaConsole;
