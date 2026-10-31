"use client";

import { RoleSidebar } from "./RoleSidebar";
import { RoleNotificationBell } from "./RoleNotificationBell";
import type { RoleManifest } from "./types";

export function RoleDesktopShell({
  manifest,
  children,
}: {
  manifest: RoleManifest;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <aside className="w-64 shrink-0 border-r border-[var(--border)]">
        <RoleSidebar manifest={manifest} />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-6 py-6">{children}</div>
      </main>
      <RoleNotificationBell className="fixed right-6 top-6 z-20" />
    </div>
  );
}
