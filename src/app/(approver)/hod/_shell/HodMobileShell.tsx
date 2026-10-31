"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { HodSidebar } from "./HodSidebar";
import { HodNotificationBell } from "./HodNotificationBell";
import { FocusMode } from "../_retention/FocusMode";

export function HodMobileShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setFocusOpen(true);
    window.addEventListener("hod:open-focus-mode", onOpen);
    return () => window.removeEventListener("hod:open-focus-mode", onOpen);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-base)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="flex size-9 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            HOD
          </span>
        </div>
        <HodNotificationBell />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-4 py-4">{children}</div>
      </main>

      {/* Left-anchored drawer */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[var(--bg-surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold">Navigation</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HodSidebar mode="drawer" onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
    </div>
  );
}
