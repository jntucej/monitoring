"use client";

import { useEffect, useState } from "react";
import { ScrollEdgeBlue } from "@/components/shared/ScrollEdgeBlue";
import { VPSidebar } from "./VPSidebar";
import { VPNotificationBell } from "./VPNotificationBell";
import { FocusMode } from "../_retention/FocusMode";

export function VPDesktopShell({ children }: { children: React.ReactNode }) {
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setFocusOpen(true);
    window.addEventListener("vp:open-focus-mode", onOpen);
    return () => window.removeEventListener("vp:open-focus-mode", onOpen);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <aside className="w-64 shrink-0 border-r border-[var(--border)]">
        <VPSidebar mode="expanded" />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <ScrollEdgeBlue className="h-full">
          <div className="mx-auto w-full max-w-7xl px-6 py-6">{children}</div>
        </ScrollEdgeBlue>
      </main>

      <VPNotificationBell className="fixed right-6 top-6 z-20" />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
    </div>
  );
}
