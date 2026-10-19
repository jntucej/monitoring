"use client";

import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { Sun, Moon, Sparkles } from "lucide-react";

const THEMES = ["dark", "light", "glass"] as const;
type Theme = (typeof THEMES)[number];

export function FloatableThemeCycler() {
  const pathname = usePathname();
  const theme = useUIStore((s) => s.theme) as Theme;
  const setTheme = useUIStore((s) => s.setTheme);

  // Hidden on the landing page — the cinematic home composition owns its own lighting.
  if (pathname === "/") return null;

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Sparkles;

  const cycle = () => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Switch theme (current: ${theme})`}
      className="fixed bottom-24 right-4 z-40 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl p-3 text-white shadow-lg transition hover:bg-black/60"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
