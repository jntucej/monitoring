"use client";

import { RoleSidebar } from "./RoleSidebar";
import { RoleNotificationBell } from "./RoleNotificationBell";
import { RoleSearchBar } from "@/components/shared/RoleSearchBar";
import type { RoleManifest } from "./types";

export function RoleDesktopShell({
  manifest,
  children,
}: {
  manifest: RoleManifest;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-base">
      <aside className="w-64 shrink-0 border-r border-border">
        <RoleSidebar manifest={manifest} />
      </aside>
      <div className="relative flex-1 overflow-y-auto">
        <RoleSearchBar role={manifest.role} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-6 py-6">
          {children}
        </main>
        <RoleNotificationBell className="fixed right-6 top-6 z-20" />
      </div>
    </div>
  );
}
