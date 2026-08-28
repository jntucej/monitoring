"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { DynamicHeader } from "./DynamicHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { NetworkStatusBanner } from "./NetworkStatusBanner";
import { Sidebar } from "./Sidebar";

interface SafeAreaAppShellProps {
  children: React.ReactNode;
}

export function SafeAreaAppShell({ children }: SafeAreaAppShellProps) {
  const { authenticated } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const pathname = usePathname();

  // The System Administrator workspace owns a full-screen, standalone shell
  // (own sidebar/header via the (sysadmin) route layout). Hide the shared
  // navigation chrome so there is no doubled sidebar/header for maximum
  // visual distinction and a tighter security surface.
  const isStandaloneSysadmin = pathname?.startsWith("/sysadmin") ?? false;

  // Initialize theme from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("gate-monitor-theme") as "dark" | "light" | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // Default to dark per project requirement
        setTheme("dark");
      }
    }
  }, [setTheme]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] antialiased selection:bg-[var(--action-primary)] selection:text-white">
      {/* Network & Offline Status Bar */}
      <NetworkStatusBanner />

      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar (hidden for the standalone SysAdmin shell) */}
        {authenticated && !isStandaloneSysadmin && <Sidebar />}

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {authenticated && !isStandaloneSysadmin && <DynamicHeader />}

          <main className={`${isStandaloneSysadmin ? "flex-1 overflow-y-auto w-full h-full" : "flex-1 p-3 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto max-w-7xl mx-auto w-full"}`}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Touch Navigation (Authenticated only, hidden for standalone SysAdmin shell) */}
      {authenticated && !isStandaloneSysadmin && <MobileBottomNav />}
    </div>
  );
}
