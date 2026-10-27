"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import {
  User,
  Sparkles,
  ShieldCheck,
  LogOut,
  Loader2,
  Check,
  Moon,
  Sun,
  Droplet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ProfileMenuButton — the console-level "profile button" for admin + sysadmin.
 *
 * Replaces the (unreachable) DynamicHeader user menu on the standalone
 * console shells. It shows the signed-in user's avatar + a dropdown with:
 *   - Appearance & Backgrounds (theme + accent, persisted per account)
 *   - My Profile  (→ /profile, or /sysadmin/profile for root)
 *   - Security    (→ /security, or /sysadmin/security for root)
 *   - Sign out    (→ store logout, hard redirect to /login)
 *
 * It is intentionally self-contained (no shared chrome) so each console owns
 * its own chrome; the menu is the single profile affordance across both.
 */

interface ProfileMenuButtonProps {
  /** Root path of the console this button lives in. Used to point the
   *  profile / security links at the role-appropriate page. */
  consoleRoot?: "/admin" | "/sysadmin";
  /** Compact (icon-only) variant for the collapsed rail / mobile drawer. */
  compact?: boolean;
  className?: string;
}

type AccentId = "emerald" | "rose" | "sky" | "amber" | "violet";

const ACCENTS: Record<AccentId, { label: string; swatch: string; ring: string }> = {
  emerald: { label: "Emerald", swatch: "bg-emerald-500", ring: "ring-emerald-500" },
  rose:    { label: "Rose",    swatch: "bg-rose-500",    ring: "ring-rose-500" },
  sky:     { label: "Sky",     swatch: "bg-sky-500",     ring: "ring-sky-500" },
  amber:   { label: "Amber",   swatch: "bg-amber-500",   ring: "ring-amber-500" },
  violet:  { label: "Violet",  swatch: "bg-violet-500",  ring: "ring-violet-500" },
};

// Per-account (localStorage) so it never collides with the app-wide theme.
const ACCENT_KEY = "gate-monitor-account-accent";

function loadAccent(): AccentId {
  if (typeof window === "undefined") return "emerald";
  try {
    const v = window.localStorage.getItem(ACCENT_KEY) as AccentId | null;
    return v && v in ACCENTS ? v : "emerald";
  } catch {
    return "emerald";
  }
}

export function ProfileMenuButton({
  consoleRoot = "/admin",
  compact = false,
  className,
}: ProfileMenuButtonProps) {
  const router = useRouter();
  const { user, role, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accent, setAccent] = useState<AccentId>(loadAccent);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = (user?.name || role || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const profileHref = consoleRoot === "/sysadmin" ? "/sysadmin/profile" : "/profile";
  const securityHref = consoleRoot === "/sysadmin" ? "/sysadmin/security" : "/security";

  const pickAccent = (id: AccentId) => {
    setAccent(id);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(ACCENT_KEY, id);
      // Apply a tint overlay to the active background so it reads instantly.
      applyAccent(id);
    } catch {
      /* no-op */
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      // logout() already sets window.location.href = "/login"; guard the hard
      // redirect in case a future change to the store drops it.
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    } catch {
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  };

  const nav = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className={cn(
          "group relative inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] p-1 transition-all hover:bg-[var(--bg-elevated)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-primary)]",
          compact ? "w-9 h-9 justify-center" : "w-9 h-9 sm:w-auto sm:pr-3 sm:pl-1"
        )}
      >
        {user?.photoUrl || user?.avatarUrl ? (
          <img
            src={user.photoUrl || user.avatarUrl!}
            alt=""
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
          />
        ) : (
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-xs font-bold ring-2 ring-[var(--action-primary)]/25">
            {initials || "U"}
          </span>
        )}
        {!compact && (
          <span className="hidden sm:block text-left min-w-0">
            <span className="block text-xs font-semibold text-[var(--text-primary)] truncate max-w-[140px]">
              {user?.name || "Account"}
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] capitalize">
              {role || "user"}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 bottom-full sm:bottom-11 z-50 mb-2 w-64 sm:w-72 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
          {/* Identity */}
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">
              {user?.name || "Account"}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {user?.email || (role ? role : "signed in")}
            </p>
          </div>

          {/* Appearance & Backgrounds */}
          <div className="px-4 py-3 border-b border-[var(--border)] space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Appearance &amp; Backgrounds
            </p>

            {/* Theme switcher (live app theme, reactive + persisted) */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--text-secondary)]">Theme</span>
              <div className="flex items-center gap-1">
                {(["dark", "light", "glass"] as const).map((t) => {
                  const Icon = t === "dark" ? Moon : t === "light" ? Sun : Sparkles;
                  const active = theme === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      aria-label={`Switch to ${t} theme`}
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                        active
                          ? "bg-[var(--action-primary)] text-white shadow-sm"
                          : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account accent / background tint */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-secondary)]">Accent</span>
                <span className="text-[10px] text-[var(--text-muted)] capitalize">
                  {ACCENTS[accent].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(Object.keys(ACCENTS) as AccentId[]).map((id) => {
                  const a = ACCENTS[id];
                  const active = accent === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickAccent(id)}
                      aria-label={`Use ${a.label} accent`}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-95",
                        a.swatch,
                        active ? cn("ring-2 ring-offset-2 ring-offset-[var(--bg-surface)]", a.ring) : "opacity-70 hover:opacity-100"
                      )}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation rows */}
          <div className="p-2 space-y-0.5">
            <MenuRow
              icon={User}
              label="My Profile"
              hint={consoleRoot === "/sysadmin" ? "Root account" : "Your details"}
              onClick={() => nav(profileHref)}
            />
            <MenuRow
              icon={ShieldCheck}
              label="Security Center"
              hint="Sessions & access"
              onClick={() => nav(securityHref)}
            />
            <div className="h-px bg-[var(--border)] my-1.5" />
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left disabled:opacity-60"
            >
              {signingOut ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof User;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors text-left"
    >
      <Icon className="w-4 h-4 text-[var(--text-muted)]" />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>}
    </button>
  );
}

/**
 * Apply an account accent by injecting a CSS variable override on <html>.
 * `--action-primary` is the live accent used by the shell (buttons, rings,
 * active nav); tinting it recolors the "backgrounds" the user sees without
 * touching the theme.
 */
function applyAccent(id: AccentId) {
  if (typeof document === "undefined") return;
  const map: Record<AccentId, string> = {
    emerald: "#10b981",
    rose: "#f43f5e",
    sky: "#0ea5e9",
    amber: "#f59e0b",
    violet: "#8b5cf6",
  };
  document.documentElement.style.setProperty("--account-accent", map[id]);
}

// re-export a small icon helper so the sidebars can render the avatar button
export { Moon, Sun, Droplet };
