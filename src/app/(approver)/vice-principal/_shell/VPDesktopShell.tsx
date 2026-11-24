"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ScrollEdgeBlue } from "@/components/shared/ScrollEdgeBlue";
import { VPSidebar } from "./VPSidebar";
import { VPNotificationBell } from "./VPNotificationBell";
import { FocusMode } from "../_retention/FocusMode";

export function VPDesktopShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setFocusOpen(true);
    window.addEventListener("vp:open-focus-mode", onOpen);
    return () => window.removeEventListener("vp:open-focus-mode", onOpen);
  }, []);

  return (
    <div className="flex h-dvh flex-col lg:flex-row overflow-hidden bg-bg-base">
      <aside className="hidden lg:block w-64 shrink-0 border">
        <VPSidebar mode="expanded" />
      </aside>

      <header className="surface-card flex lg:hidden h-11 shrink-0 items-center justify-between bg-bg-surface px-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated"
          >
            <Menu className="size-4" />
          </button>
          <span className="text-sm font-semibold text-text-primary">Vice Principal</span>
        </div>
        <VPNotificationBell />
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden">
        <ScrollEdgeBlue className="h-full">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 lg:py-6 pb-[max(4rem,env(safe-area-inset-bottom))] lg:pb-24">
            {children}
          </div>
        </ScrollEdgeBlue>
      </main>

      <VPNotificationBell className="hidden lg:block fixed right-6 top-6 z-20" />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-bg-surface shadow-xl pb-[env(safe-area-inset-bottom)]">
            <div className="surface-card flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">Navigation</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <VPSidebar mode="expanded" onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
