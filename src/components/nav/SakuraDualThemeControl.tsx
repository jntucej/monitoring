"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Flower2, Sparkles } from "lucide-react";

export type ThemeFamily = "default" | "sakuga";
export type ColorPolarity = "light" | "dark";

const THEME_KEY = "app_theme_family";
const MODE_KEY = "app_color_polarity";

export function applyThemeToDom(family: ThemeFamily, mode: ColorPolarity) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", family);
  root.setAttribute("data-mode", mode);
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  if (family === "sakuga" && !document.querySelector('script[src^="/sakuga-vfx/"]')) {
    for (const name of ["button", "checkbox", "radio", "toggle", "progress", "tabs", "toast", "slider", "input", "rating", "tooltip"]) {
      const s = document.createElement("script");
      s.src = `/sakuga-vfx/${name}.js`;
      s.async = false;
      document.head.appendChild(s);
    }
  }
}

export function SakuraDualThemeControl() {
  const [family, setFamily] = useState<ThemeFamily>("default");
  const [mode, setMode] = useState<ColorPolarity>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedFamily =
      (window.localStorage.getItem(THEME_KEY) as ThemeFamily | null) ?? "default";
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const savedMode =
      (window.localStorage.getItem(MODE_KEY) as ColorPolarity | null) ??
      (prefersDark ? "dark" : "light");

    setFamily(savedFamily);
    setMode(savedMode);
    applyThemeToDom(savedFamily, savedMode);
  }, []);

  const selectFamily = (nextFamily: ThemeFamily) => {
    setFamily(nextFamily);
    window.localStorage.setItem(THEME_KEY, nextFamily);
    applyThemeToDom(nextFamily, mode);
  };

  const selectMode = (nextMode: ColorPolarity) => {
    setMode(nextMode);
    window.localStorage.setItem(MODE_KEY, nextMode);
    applyThemeToDom(family, nextMode);
  };

  if (!mounted) return null;

  return (
    <div
      data-testid="sakura-dual-theme-control"
      className="surface-card bg-bg-surface p-3.5 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <Flower2 className="h-4 w-4 text-action-primary" />
          <span>Theme &amp; Polarity</span>
        </p>
        <p className="text-xs text-text-muted">
          Switch between Default and Sakura themes in Light or Dark mode.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="surface-card inline-flex bg-bg-elevated p-0.5 text-xs">
          <button
            type="button"
            onClick={() => selectFamily("default")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              family === "default"
                ? "bg-action-primary text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Default</span>
          </button>
          <button
            type="button"
            onClick={() => selectFamily("sakuga")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              family === "sakuga"
                ? "bg-action-primary text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Flower2 className="h-3.5 w-3.5" />
            <span>Sakuga</span>
          </button>
        </div>

        <div className="surface-card inline-flex bg-bg-elevated p-0.5 text-xs">
          <button
            type="button"
            onClick={() => selectMode("light")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              mode === "light"
                ? "bg-action-primary text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => selectMode("dark")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              mode === "dark"
                ? "bg-action-primary text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </div>
  );
}
