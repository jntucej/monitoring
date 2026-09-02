"use client";

import { useEffect } from "react";
import { BookOpen, Sun, Moon, Sparkles } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

/**
 * Layout for /study pages.
 *
 * ponytail: login gate removed per owner request — resources are open for now.
 * Upgrade path: restore the sessionStorage gate (git history: 58aeba07^) or
 * real role + server auth if this ever protects anything sensitive.
 */

type Theme = "dark" | "glass" | "light";

const THEMES: { id: Theme; icon: typeof Sun; label: string }[] = [
  { id: "dark", icon: Moon, label: "Dark" },
  { id: "glass", icon: Sparkles, label: "Glossy" },
  { id: "light", icon: Sun, label: "Light" },
];

/** Compact Dark/Glossy/Light switcher — mirrors the store's setTheme side effects. */
function ThemeSwitcher() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  // Align the store with the theme the root-layout boot script already applied
  // (store default is "dark"; the boot key is the ground truth before hydration).
  useEffect(() => {
    try {
      const t = localStorage.getItem("gate-monitor-theme");
      if (t === "dark" || t === "glass" || t === "light") setTheme(t);
    } catch {}
  }, [setTheme]);

  const pick = (t: Theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 300);
    }
    setTheme(t);
  };

  return (
    <div role="radiogroup" aria-label="Theme selection" className="flex items-center gap-0.5 p-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
      {THEMES.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={isActive}
            aria-label={`Switch to ${t.label} theme`}
            title={`${t.label} theme`}
            onClick={() => pick(t.id)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              isActive
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-[100dvh] bg-[var(--bg-base)]">{children}</div>;
}

export function StudyHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-[var(--bg-surface)]/80 border-b border-[var(--border)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="w-5 h-5 text-[var(--action-primary)] shrink-0" />
          <span className="font-bold text-sm text-[var(--text-primary)] truncate">{title}</span>
        </div>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
