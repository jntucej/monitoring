"use client";

import { useEffect, useState } from "react";
import { PrincipalSidebar } from "./PrincipalSidebar";
import { PrincipalNotificationBell } from "./PrincipalNotificationBell";
import { FocusMode } from "../_retention/FocusMode";

export function PrincipalDesktopShell({ children }: { children: React.ReactNode }) {
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setFocusOpen(true);
    window.addEventListener("principal:open-focus-mode", onOpen);
    return () => window.removeEventListener("principal:open-focus-mode", onOpen);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <aside className="w-64 shrink-0 border-r border-[var(--border)]">
        <PrincipalSidebar mode="expanded" />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-6 py-6">{children}</div>
      </main>

      <PrincipalNotificationBell className="fixed right-6 top-6 z-20" />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
    </div>
  );
}
