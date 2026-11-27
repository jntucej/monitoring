"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { RoleSidebar } from "./RoleSidebar";
import { RoleNotificationBell } from "./RoleNotificationBell";
import { RoleSearchBar } from "@/components/shared/RoleSearchBar";
import type { RoleManifest } from "./types";

export function RoleMobileShell({
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
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex h-dvh flex-col bg-bg-base overflow-x-hidden">
      <header className="surface-card flex h-12 shrink-0 items-center justify-between bg-bg-surface px-3">
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
        <RoleNotificationBell />
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden">
        <RoleSearchBar role={manifest.role} />
        <div className="mx-auto w-full px-4 py-4 pb-[env(safe-area-inset-bottom)]">{children}</div>
      </main>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-bg-surface shadow-xl pb-[env(safe-area-inset-bottom)]">
            <div className="surface-card flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">Navigation</span>
              <button
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
