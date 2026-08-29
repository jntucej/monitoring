"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useGlass } from "@/context/GlassContext";
import { DynamicHeader } from "./DynamicHeader";
import { NetworkStatusBanner } from "./NetworkStatusBanner";
import { Sidebar } from "./Sidebar";
import { GlassDeviceFallback } from "./GlassDeviceFallback";
import { FloatingOrbs } from "./FloatingOrbs";

interface SafeAreaAppShellProps {
  children: React.ReactNode;
}

export function SafeAreaAppShell({ children }: SafeAreaAppShellProps) {
  const { authenticated } = useAuthStore();
  const { theme, setTheme, isSidebarCollapsed } = useUIStore();
  const { performanceTier } = useGlass();
  const pathname = usePathname();

  // Toggle .enable-glass class on <html> based on performanceTier
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (performanceTier === "legacy" || performanceTier === "emergency") {
      document.documentElement.classList.remove("enable-glass");
    } else {
      document.documentElement.classList.add("enable-glass");
    }
  }, [performanceTier]);

  // The System Administrator workspace owns a full-screen, standalone shell
  // (own sidebar/header via the (sysadmin) route layout). Hide the shared
  // navigation chrome so there is no doubled sidebar/header for maximum
  // visual distinction and a tighter security surface.
  const isStandaloneSysadmin = pathname?.startsWith("/sysadmin") ?? false;

  // Initialize theme from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("gate-monitor-theme") as "dark" | "light" | "glass" | null;
      if (savedTheme && (savedTheme === "dark" || savedTheme === "light" || savedTheme === "glass")) {
        setTheme(savedTheme);
      } else {
        // Default to dark per project requirement
        setTheme("dark");
      }
    }
  }, [setTheme]);

  const showNav = authenticated && !isStandaloneSysadmin;

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] antialiased selection:bg-[var(--action-primary)] selection:text-white">
      {/* Ambient Desktop Mouse-Parallax Orbs Layer */}
      <FloatingOrbs />

      {/* Network & Offline Status Bar */}
      <NetworkStatusBanner />

      {/* Unified Responsive Navigation (Desktop Sidebar + Mobile Drawer + Bottom Tabs) */}
      {showNav && <Sidebar />}

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          showNav ? (isSidebarCollapsed ? "md:pl-16" : "md:pl-64") : ""
        }`}
      >
        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {showNav && <DynamicHeader />}

          <main
            className={`overscroll-contain ${
              isStandaloneSysadmin
                ? "flex-1 overflow-y-auto w-full h-full"
                : "flex-1 p-3 sm:p-5 md:p-6 pb-24 lg:pb-6 overflow-y-auto max-w-7xl mx-auto w-full"
            }`}
          >
            <GlassDeviceFallback />
            <AnimatePresence mode="wait">
              <motion.div
                key={`${pathname || "page"}-${theme}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full flex flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}


