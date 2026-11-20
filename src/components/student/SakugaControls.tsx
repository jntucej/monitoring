"use client";

// SakugaControls — a "Console effects" panel rendered ONLY when the active
// theme is sakuga (female-student UI). It puts the sakuga-VFX custom elements
// to real use: before this, the VFX control scripts (button, checkbox, radio,
// toggle, progress, tabs, toast, slider, input, rating, tooltip) were loaded
// but inert because nothing in the JSX used the <sakuga-*> tags. This panel
// gives the highest-signal ones a live home so the themed student console
// actually demonstrates the anime controls.
//
// Graphite users never see it (gated on data-theme === "sakuga"), so it adds
// zero nodes to the non-themed path. Custom elements are rendered via the
// `dangerouslySetInnerHTML`-free JSX tags; unregistered tags degrade to inert
// <sakuga-*> shells, so a missing script can't break the page.

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Palette, Sparkles } from "lucide-react";

// Register the VFX custom-element tags in the React JSX namespace so TSX
// accepts <sakuga-*> without TS2339 (module augmentation of "react", the form
// that works on React 18 — NOT `declare global`). sakuga-progress is already
// declared in SakugaLoadingSplash.tsx (with its set()/value typing), so it is
// intentionally omitted here to avoid a TS2717 type-conflict on the tag.
type SakugaProps = Record<string, unknown> & { children?: ReactNode };
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sakuga-button": SakugaProps;
      "sakuga-checkbox": SakugaProps;
      "sakuga-radio": SakugaProps;
      "sakuga-toggle": SakugaProps;
      "sakuga-tabs": SakugaProps;
      "sakuga-toast": SakugaProps;
      "sakuga-slider": SakugaProps;
      "sakuga-input": SakugaProps;
      "sakuga-rating": SakugaProps;
      "sakuga-tooltip": SakugaProps;
    }
  }
}

/** Track whether the active theme is sakuga. Poll a few times post-auth (the
 *  loader sets data-theme after login, so a single mount-check can miss it),
 *  AND watch for live changes so switching graphite→sakuga / sakuga→graphite
 *  in-place updates the panel without a full navigation. */
function useIsSakuga(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    let observer: MutationObserver | undefined;

    const read = () => document.documentElement.getAttribute("data-theme") === "sakuga";

    // Initial + post-auth polling (a few ticks, in case the loader sets the
    // theme slightly after this component mounts).
    const check = () => {
      setOn(read());
      if (!read() && ++tries < 6) timer = setTimeout(check, 400);
    };
    check();

    // React to live theme switches (the ThemePicker sets the attribute in-place).
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

function ControlRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

export function SakugaControls() {
  const isSakuga = useIsSakuga();

  if (!isSakuga) return null; // graphite users: no extra nodes

  return (
    <section aria-label="Console effects (sakuga)" className="surface-card p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-action-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Console effects
        </p>
        <span className="ml-auto flex items-center gap-1 text-xs text-text-muted">
          <Palette className="h-3.5 w-3.5" /> anime controls
        </span>
      </div>

      <div>
        <ControlRow label="Tap to rate" hint="Star rating">
          <sakuga-rating value={3} label="rate">★</sakuga-rating>
        </ControlRow>

        <ControlRow label="Drag slider" hint="Slider">
          <sakuga-slider min="0" max="100" value="50" label="level" unit="%" />
        </ControlRow>

        <ControlRow label="Flip / tick" hint="Toggle & checkbox">
          <sakuga-toggle checked label="night">night</sakuga-toggle>
          <sakuga-checkbox checked label="remind">remind</sakuga-checkbox>
        </ControlRow>

        <ControlRow label="Pick one" hint="Radio group">
          <sakuga-radio name="density" value="comfy" checked label="comfy">comfy</sakuga-radio>
          <sakuga-radio name="density" value="compact" label="compact">compact</sakuga-radio>
        </ControlRow>

        <ControlRow label="Type a note" hint="Text input">
          <sakuga-input placeholder="Type here…" label="note" />
        </ControlRow>

        <div className="flex flex-wrap items-center gap-3 py-3">
          <sakuga-button variant="secondary" label="cancel">
            Cancel
          </sakuga-button>
          <sakuga-button label="confirm">Confirm</sakuga-button>
        </div>
      </div>
    </section>
  );
}

export default SakugaControls;
