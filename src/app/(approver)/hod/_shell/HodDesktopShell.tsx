"use client";

import { useEffect, useState } from "react";
import { ScrollEdgeBlue } from "@/components/shared/ScrollEdgeBlue";
import { HodSidebar } from "./HodSidebar";
import { HodNotificationBell } from "./HodNotificationBell";
import { FocusMode } from "../_retention/FocusMode";

export function HodDesktopShell({ children }: { children: React.ReactNode }) {
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setFocusOpen(true);
    window.addEventListener("hod:open-focus-mode", onOpen);
    return () => window.removeEventListener("hod:open-focus-mode", onOpen);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <aside className="w-64 shrink-0 border-r border-[var(--border)]">
        <HodSidebar mode="expanded" />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <ScrollEdgeBlue className="h-full">
          <ScrollEdgeBlue className="h-full">
                      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</div>
          </ScrollEdgeBlue>
        </ScrollEdgeBlue>
      </main>

      <HodNotificationBell className="fixed right-6 top-6 z-20" />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
    </div>
  );
}
