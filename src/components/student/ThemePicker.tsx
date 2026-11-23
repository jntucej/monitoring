"use client";

// ThemePicker — let the user switch between the two shipped UI skins:
//   graphite (professional, neutral)  |  sakuga (anime, lavender/purple)
//
// Persists via PATCH /api/preferences/theme (Bearer-JWT + same-origin CSRF),
// and applies the CSS override immediately (no reload) for live feedback.
// The loader in ClientProviders re-applies on the next mount, so this also
// survives navigation. Rendered inside the student Account/Profile section.
//
// Taste-layer integration: theme is the `appearance.theme` preference key.
// If a future policy pins the theme (rank "required"), the picker shows the
// 🔒 LockedByPolicy chip and disables the buttons — the shell still renders,
// but the choice is governed by the resolver, not hardcoded.
//
// It is theme-agnostic: it shows in BOTH themes so the user can switch away
// from sakuga back to graphite (a sakuga-only control would be impossible
// to reverse from).

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Palette, Check, Loader2, Lock } from "lucide-react";
import { LockedByPolicy } from "@/components/shared/LockedByPolicy";
import { useEffectivePref } from "@/hooks/useEffectivePref";
import { useAuthStore } from "@/stores/authStore";
import { SakuraDualThemeControl } from "@/components/nav/SakuraDualThemeControl";

type ThemeName = "graphite" | "sakuga";

// Theme availability by gender:
//   female → graphite + sakuga (can switch)
//   male   → graphite only (sakuga hidden, locked to graphite)
//   null/unknown → graphite only
const THEMES: { id: ThemeName; label: string; sub: string; swatch: string }[] = [
  {
    id: "graphite",
    label: "Graphite",
    sub: "Professional, neutral",
    swatch: "linear-gradient(135deg, var(--color-text-primary), var(--color-text-secondary))",
  },
  {
    id: "sakuga",
    label: "Sakuga",
    sub: "Anime, lavender",
    swatch: "linear-gradient(135deg, var(--sk-card), var(--sk-pri, var(--color-primary)) 60%, var(--sk-acc, var(--color-danger)))",
  },
];

export function ThemePicker() {
  const [current, setCurrent] = useState<ThemeName | null>(null);
  const [saving, setSaving] = useState<ThemeName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  // Gender-gated theme availability
  const isFemale = user?.studentDetails?.gender === "female";
  const availableThemes = isFemale ? THEMES : THEMES.filter((t) => t.id === "graphite");

  // Taste layer: is the theme pinned by policy? (rank "required")
  const themePref = useEffectivePref<ThemeName>("appearance.theme");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/preferences/theme", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.ui_theme) setCurrent(d.ui_theme as ThemeName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Effective theme: policy-pinned value when locked, else the user's choice.
  const effectiveTheme: ThemeName | null = themePref.locked ? themePref.value : current;

  const apply = async (name: ThemeName) => {
    if (themePref.locked) {
      // Required rank: the choice is governed by policy. Stored for audit only.
      setError("Theme is set by institute and cannot be changed.");
      return;
    }
    setSaving(name);
    setError(null);
    try {
      const res = await fetch("/api/preferences/theme", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ui_theme: name }),
      });
      const ok = res.ok;
      // Apply the CSS override NOW so the user sees the switch without a reload.
      // (ClientProviders re-applies on the next mount / navigation.)
      if (name === "sakuga") document.documentElement.setAttribute("data-theme", "sakuga");
      else document.documentElement.removeAttribute("data-theme");
      if (!ok) setError("Couldn't save — please try again.");
      setCurrent(name);
    } catch {
      setError("Couldn't save — please try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section
      aria-label="Appearance"
      className="surface-card p-4 md:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <Palette className="h-4 w-4 text-action-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Appearance
        </p>
        {themePref.locked && <LockedByPolicy compact reason="Theme set by institute" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {availableThemes.map((t) => {
          const active = (themePref.locked ? effectiveTheme : current) === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => apply(t.id)}
              disabled={saving !== null || themePref.locked}
              aria-pressed={active}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-action-primary ring-2 ring-action-primary/30 bg-surface-raised"
                  : "border-border hover:border-border-strong bg-bg-surface",
              )}
            >
              <span
                aria-hidden
                className="size-9 shrink-0 rounded-lg border border-border/40 shadow-sm"
                style={{ background: t.swatch }}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text-primary">
                  {t.label}
                </span>
                <span className="block truncate text-xs text-text-muted">{t.sub}</span>
              </span>
              {saving === t.id ? (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-muted" />
              ) : active ? (
                <Check className="absolute right-3 top-3 h-4 w-4 text-action-success" />
              ) : null}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-action-danger">{error}</p>}
      <p className="mt-3 text-xs text-text-muted">
        Switching applies instantly and is saved to your account.
      </p>
      <div className="mt-4">
        <SakuraDualThemeControl />
      </div>
    </section>
  );
}

export default ThemePicker;
