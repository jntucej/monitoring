"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Menu, X } from "lucide-react";
import { RoleSidebar } from "./RoleSidebar";
import { RoleNotificationBell } from "./RoleNotificationBell";
import { RoleSearchBar } from "@/components/shared/RoleSearchBar";
import type { RoleManifest } from "./types";

const AgentConsoleDrawer = dynamic(
  () => import("@/components/bot/AgentConsoleDrawer").then((m) => m.AgentConsoleDrawer),
  { ssr: false },
);

/**
 * RoleResponsiveShell — single-mount responsive shell for all role consoles.
 * Renders {children} and <main id="main-content"> exactly ONCE across desktop
 * and mobile breakpoints, preventing duplicate API fetches, polling timers,
 * and duplicate #main-content landmarks.
 */
export function RoleResponsiveShell({
  manifest,
  children,
}: {
  manifest: RoleManifest;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex h-dvh flex-col lg:flex-row overflow-hidden bg-bg-base">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border">
        <RoleSidebar manifest={manifest} />
      </aside>

      {/* Mobile top bar */}
      <header className="surface-card flex lg:hidden h-12 shrink-0 items-center justify-between bg-bg-surface px-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-semibold text-text-primary">
            {manifest.brand.short}
          </span>
        </div>
      </header>

      {/* Single-mounted main content */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
        <RoleSearchBar role={manifest.role} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl px-4 py-4 pb-[env(safe-area-inset-bottom)] lg:px-6 lg:py-6"
        >
          {children}
        </main>
        {/* One bell instance; CSS places it per breakpoint (UX-010: was
            dual-mounted, doubling polling + badge state). */}
        <RoleNotificationBell className="fixed right-6 top-6 z-20 lg:right-6 lg:top-6" />
        <AgentConsoleDrawer role={manifest.role} />
      </div>

      {/* Mobile navigation drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-bg-surface shadow-xl pb-[env(safe-area-inset-bottom)]">
            <div className="surface-card flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">Navigation</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RoleSidebar manifest={manifest} onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
