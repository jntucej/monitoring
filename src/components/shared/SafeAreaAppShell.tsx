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
import { FloatingOrbs } from "./FloatingOrbs";
import { AppLoadingScreen } from "./AppLoadingScreen";

interface SafeAreaAppShellProps {
  children: React.ReactNode;
}

export function SafeAreaAppShell({ children }: SafeAreaAppShellProps) {
  // The loading screen covers the app while the auth store hydrates.
  // `_hasHydrated` becomes true after ClientProviders' checkSession() completes.
  const { _hasHydrated } = useAuthStore();
  const { authenticated } = useAuthStore();

  // Auth shell + global loading overlay (first paint + route transition)
  const showApp = _hasHydrated;
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

  // The home page (/) is a public marketing surface: it streams in fast with a
  // lean SSR shell and does not need the auth-hydration gate. Skip the global
  // AppLoadingScreen there so opening the portal lands on content, not on a
  // full-screen "Loading…" overlay. Guarded/role consoles keep the screen.
  const isHome = pathname === "/" || pathname === "";
  const isLogin = pathname?.startsWith("/login");

  // Standalone console routes own their full-screen shell (their own sidebar +
  // header via the route layout). The shared nav chrome (global Sidebar +
  // DynamicHeader + bottom tabs) is hidden for these so it never double-renders
  // over the console's own shell. Both /sysadmin and /admin are full consoles
  // with their own manifest-driven sidebar; everything else uses the shared
  // SafeAreaAppShell navigation.
  const isStandaloneConsole =
    pathname?.startsWith("/sysadmin") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/operator") ||
    pathname?.startsWith("/gate");

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

  const showNav = _hasHydrated && authenticated && !isStandaloneConsole;

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] antialiased selection:bg-[var(--action-primary)] selection:text-white pt-safe pb-safe pl-safe pr-safe">
      {/* Global loading overlay — covers the entire shell until auth hydrates.
          Suppressed on the home page so / lands on content, not a loader. */}
      {!isHome && !isLogin && <AppLoadingScreen />}
      {/* Ambient Desktop Mouse-Parallax Orbs — skipped on / and /login */}
      {!isHome && !isLogin && <FloatingOrbs />}

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
            className={
              isStandaloneConsole
                ? "flex-1 w-full"
                : "flex-1 p-3 sm:p-5 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full"
            }
          >

            <AnimatePresence mode="wait">
              <motion.div
                key={pathname || "page"}
                initial={isHome ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="w-full flex flex-col"
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


