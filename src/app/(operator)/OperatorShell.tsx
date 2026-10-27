"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  QrCode,
  Clock,
  ShieldAlert,
  MoreHorizontal,
  Mic,
  KeyRound,
  UserCheck,
  Camera,
  User,
  Bell,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { getConsoleConfig } from "@/config/consoles";

const ALLOWED_ROLES = ["operator", "worker", "admin", "sysadmin"] as const;

interface MoreMenuItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

const MORE_ITEMS: MoreMenuItem[] = [
  { label: "Voice Assistant", icon: Mic, href: "/operator/scan" },
  { label: "Manual Entry", icon: KeyRound, href: "/operator/manual-entry" },
  { label: "Pass Verification", icon: UserCheck, href: "/operator/pass-verification" },
  { label: "Camera Scanner", icon: Camera, href: "/operator/scan" },
  { label: "My Profile", icon: User, href: "/profile" },
  { label: "Notifications", icon: Bell, href: "/operator/exceptions" },
  { label: "Sign out", icon: LogOut, href: "__signout__" },
];

/**
 * Rail items. The `/operator` root is a redirect surface, not a page — on the
 * rail it points at `/operator/scan` (the desk) so a mobile user tapping
 * "Scan" lands on the kiosk launcher. The "scan" item's `match` covers BOTH
 * `/operator/scan*` and `/gate/*` so the scan desk (a sibling of /operator/*,
 * not a child of it) still shows the rail as active.
 */
const RAIL: Array<{
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}> = [
  {
    id: "scan",
    label: "Scan",
    href: "/operator/scan",
    icon: QrCode,
    match: (p) => p.startsWith("/operator/scan") || p.startsWith("/gate/"),
  },
  {
    id: "log",
    label: "Log",
    href: "/operator/transactions",
    icon: Clock,
    match: (p) => p.startsWith("/operator/transactions"),
  },
  {
    id: "flags",
    label: "Flags",
    href: "/operator/exceptions",
    icon: ShieldAlert,
    match: (p) => p.startsWith("/operator/exceptions"),
  },
];

/**
 * OperatorShell — the operator console's top-level layout (inherited by EVERY
 * route under (operator)/, including /gate/[gateId] and /worker/*).
 *
 * Before this was here (only AuthGuard), /gate/[gateId] — the actual scan
 * desk — had zero navigation on any screen size: it's a SIBLING of /operator/*,
 * not a child, so it never inherited the 4-icon rail that lived one level
 * deeper in (operator)/operator/layout.tsx. A mobile operator at /gate/MAIN
 * had no way to reach /operator/transactions or /operator/exceptions.
 *
 * h-dvh (not h-screen) so the container tracks the real visible viewport on
 * iOS (100vh includes the URL-bar area, which would push the scan desk's
 * bottom controls below the fold on a phone).
 */
export function OperatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close More menu on any navigation.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Esc closes the More menu.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // Console config may still drive which rail items show (defensive: the
  // operator console has historically controlled its rail via
  // getConsoleConfig("operator").nav). Fall back to the full RAIL if unset.
  const config = getConsoleConfig("operator");
  const navKeys = config?.nav ?? ["scan", "log", "flags", "more"];
  const activeRail = RAIL.filter((item) => navKeys.includes(item.id) || item.id !== "more");

  // Handle a More-menu item click: sign out runs the real logout flow,
  // everything else navigates.
  const handleMoreItemClick = (item: MoreMenuItem) => {
    setMoreOpen(false);
    if (item.href === "__signout__") {
      useAuthStore.getState().logout();
      router.replace("/login");
      return;
    }
    router.push(item.href);
  };

  const renderRailLink = (item: (typeof RAIL)[number]) => {
    const active = item.match(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        )}
      >
        <Icon className="h-5 w-5" />
      </Link>
    );
  };

  const moreButton = (mobile: boolean) => (
    <button
      type="button"
      onClick={() => setMoreOpen((v) => !v)}
      aria-expanded={moreOpen}
      aria-haspopup="menu"
      aria-label="More"
      title="More"
      className={cn(
        "flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
        mobile ? "h-11 flex-1" : "h-11 w-11"
      )}
    >
      <MoreHorizontal className="h-5 w-5" />
    </button>
  );

  return (
    <AuthGuard allowedRoles={[...ALLOWED_ROLES]}>
      <div className="flex h-dvh w-full overflow-hidden bg-[var(--bg-base)]">
        {/* Desktop rail (md+) */}
        <nav
          aria-label="Operator navigation"
          className="hidden md:flex md:w-14 md:flex-col md:items-center md:gap-1 md:border-r md:border-[var(--border)] md:bg-[var(--bg-surface)] md:py-3"
        >
          {activeRail.map(renderRailLink)}
          {navKeys.includes("more") && (
            <div className="relative mt-auto">
              {moreButton(false)}
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute bottom-14 left-2 z-50 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl"
                >
                  {MORE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => handleMoreItemClick(item)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Main scroll region */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>

          {/* Mobile More menu — full-screen bottom sheet, not a popover */}
          {moreOpen && (
            <div
              role="menu"
              className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
              onClick={() => setMoreOpen(false)}
            >
              <div
                className="rounded-t-2xl bg-[var(--bg-elevated)] pb-safe"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mt-2 h-1 w-10 rounded bg-[var(--border-strong)]" />
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => handleMoreItemClick(item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--text-primary)] border-b border-[var(--border)] last:border-b-0"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile bottom tab bar (below md) — thumb-reach, safe-area-aware.
              The desktop rail already covers md+; this is the mobile-only nav. */}
          <nav
            aria-label="Operator navigation"
            className="md:hidden flex items-center justify-around border-t border-[var(--border)] bg-[var(--bg-surface)] pb-safe"
          >
            {activeRail.map(renderRailLink)}
            {navKeys.includes("more") && moreButton(true)}
          </nav>
        </div>
      </div>
    </AuthGuard>
  );
}
