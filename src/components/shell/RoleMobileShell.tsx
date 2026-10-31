"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { RoleSidebar } from "./RoleSidebar";
import { RoleNotificationBell } from "./RoleNotificationBell";
import type { RoleManifest } from "./types";

export function RoleMobileShell({
  manifest,
  children,
}: {
  manifest: RoleManifest;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

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
            {manifest.brand.short}
          </span>
        </div>
        <RoleNotificationBell />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-4 py-4">{children}</div>
      </main>

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
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="size-4" />
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
