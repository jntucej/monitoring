"use client";

import { useUIStore } from "@/stores/uiStore";
import { Sun, Moon, Sparkles, ChevronRight } from "lucide-react";

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
      title={`${current.label} theme — click for ${nextTheme}`}
      className="group fixed bottom-20 left-4 z-30 flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur border border-[var(--border-strong)] shadow-lg text-[var(--text-primary)] hover:shadow-xl active:scale-95 transition-all md:bottom-4"
    >
      <ActiveIcon className="w-4 h-4 text-[var(--action-primary)]" />
      <span className="text-[11px] font-semibold tracking-wide opacity-70 group-hover:opacity-100 transition-opacity">
        {nextTheme === "dark" ? "Dark" : nextTheme === "light" ? "Light" : "Glossy"}
      </span>
      <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
    </button>
  );
}

export default FloatableThemeCycler;
