"use client";

import React from "react";
import { useAuthStore } from "@/stores/authStore";
import { DynamicHeader } from "./DynamicHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { NetworkStatusBanner } from "./NetworkStatusBanner";
import { Sidebar } from "./Sidebar";

interface SafeAreaAppShellProps {
  children: React.ReactNode;
}

export function SafeAreaAppShell({ children }: SafeAreaAppShellProps) {
  const { authenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] antialiased selection:bg-[var(--action-primary)] selection:text-white">
      {/* Network & Offline Status Bar */}
      <NetworkStatusBanner />

      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        {authenticated && <Sidebar />}

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {authenticated && <DynamicHeader />}

          <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Touch Navigation (Authenticated only) */}
      {authenticated && <MobileBottomNav />}
    </div>
  );
}
