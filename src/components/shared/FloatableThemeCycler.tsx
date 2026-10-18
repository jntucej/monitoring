"use client";

import { useUIStore } from "@/stores/uiStore";
import { Sun, Moon, Sparkles } from "lucide-react";

/**
 * A small floatable button that cycles the app theme (dark → light → glass).
 * Fixed to the corner of the viewport so it is reachable from every page
 * without cluttering the top nav. Clicking advances to the next theme; the
 * current theme is shown as both an icon and a label on hover.
 */
const ORDER: Array<"dark" | "light" | "glass"> = ["dark", "light", "glass"];

const META: Record<"dark" | "light" | "glass", { Icon: typeof Sun; label: string }> = {
  dark: { Icon: Moon, label: "Dark" },
  light: { Icon: Sun, label: "Light" },
  glass: { Icon: Sparkles, label: "Glossy" },
};

export function FloatableThemeCycler() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const current = META[theme] ?? META.dark;
  const nextTheme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  const cycle = () => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 300);
    }
    setTheme(nextTheme);
  };

  const ActiveIcon = current.Icon;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${current.label}. Click to switch to ${nextTheme}.`}
      title={`Switch to ${nextTheme} theme`}
      className="group fixed bottom-20 left-4 z-30 flex items-center justify-center rounded-full bg-[var(--bg-surface)]/80 backdrop-blur border border-[var(--border-strong)] shadow-lg text-[var(--text-primary)] hover:shadow-xl active:scale-95 transition-all h-9 w-9 md:bottom-4"
    >
      {/* Icon-only — the symbol communicates state; the accessible name stays
          for screen readers and a tooltip covers sighted users. */}
      <ActiveIcon className="w-4 h-4 text-[var(--action-primary)]" />
      <span className="sr-only">{current.label} theme. Next: {nextTheme}.</span>
    </button>
  );
}

export default FloatableThemeCycler;
