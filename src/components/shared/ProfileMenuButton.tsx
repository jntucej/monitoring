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
  emerald: { label: "Emerald", swatch: "bg-action-success", ring: "ring-action-success" },
  rose:    { label: "Rose",    swatch: "bg-action-danger",    ring: "ring-action-danger" },
  sky:     { label: "Sky",     swatch: "bg-action-info",     ring: "ringaction-info" },
  amber:   { label: "Amber",   swatch: "bg-action-warning",   ring: "ringaction-warning" },
  violet:  { label: "Violet",  swatch: "bg-unit-c",  ring: "ring-unit-c" },
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
        router.push("/login");
      }
    } catch {
/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */ // last-resort hard nav if the SPA router itself failed
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
          "group relative inline-flex items-center gap-2 rounded-full border border-border bg-bg-surface p-1 transition-all hover:bg-bg-elevated",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary",
          compact ? "size-6 justify-center" : "size-6 sm:w-auto sm:pr-3 sm:pl-1"
        )}
      >
        {user?.photoUrl || user?.avatarUrl ? (
          <img
            src={user.photoUrl || user.avatarUrl!}
            alt=""
            className="size-6 sm:w-6 sm:h-6 rounded-full object-cover"
          />
        ) : (
          <span className="size-6 sm:w-6 sm:h-6 rounded-full bg-action-primary/20 text-action-primary flex items-center justify-center text-xs font-bold ring-2 ring-action-primary/25">
            {initials || "U"}
          </span>
        )}
        {!compact && (
          <span className="hidden sm:block text-left min-w-4">
            <span className="block text-xs font-semibold text-text-primary truncate max-w35">
              {user?.name || "Account"}
            </span>
            <span className="block text-xs uppercase tracking-wider text-text-muted capitalize">
              {role || "user"}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 bottom-full sm:bottom-11 z-50 mb-2 w-[calc(100vw-2rem)] sm:w-6 max-w-xs rounded-2xl border border-border bg-bg-surface shadow-2xl overflow-hidden max-h-[85dvh] overflow-y-auto">
          {/* Identity */}
          <div className="surface-card px-4 py-3">
            <p className="text-sm font-bold text-text-primary truncate">
              {user?.name || "Account"}
            </p>
            <p className="text-xs text-text-muted truncate">
              {user?.email || (role ? role : "signed in")}
            </p>
          </div>

          {/* Appearance & Backgrounds */}
          <div className="surface-card px-4 py-3 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Appearance &amp; Backgrounds
            </p>


            {/* Account accent / background tint */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-secondary">Accent</span>
                <span className="text-xs text-text-muted capitalize">
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
                        "size-6 min-w8 min-h8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all active:scale-95",
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
            <div className="h-px bgborder my-1.5" />
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="surface-card w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left disabled:opacity-60"
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
      className="surface-card w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors text-left"
    >
      <Icon className="w-4 h-4 text-text-muted" />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
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
    emerald: "var(--action-success)",
    rose: "var(--alert-critical)",
    sky: "var(--action-info)",
    amber: "var(--action-warning)",
    violet: "var(--unit-c)",
  };
  document.documentElement.style.setProperty("--account-accent", map[id]);
}

// re-export a small icon helper so the sidebars can render the avatar button
export { Moon, Sun, Droplet } from "lucide-react";
