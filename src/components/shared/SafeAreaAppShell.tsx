"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { DynamicHeader } from "./DynamicHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { NetworkStatusBanner } from "./NetworkStatusBanner";
import { Sidebar } from "./Sidebar";
import { Sun, Moon, Sparkles, Smartphone } from "lucide-react";

interface SafeAreaAppShellProps {
  children: React.ReactNode;
}

export function SafeAreaAppShell({ children }: SafeAreaAppShellProps) {
  const { authenticated } = useAuthStore();
  const { theme, setTheme, deviceProfile, setDeviceProfile, addToast } = useUIStore();

  // Initialize theme and device profile from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("gate-monitor-theme") as "dark" | "light" | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // Default to dark per project requirement
        setTheme("dark");
      }

      const savedProfile = localStorage.getItem("gate-monitor-device-profile") as "high-end" | "low-profile" | null;
      if (savedProfile) {
        setDeviceProfile(savedProfile);
      } else {
        setDeviceProfile("high-end");
      }
    }
  }, [setTheme, setDeviceProfile]);

  const toggleThemeMode = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    addToast({
      title: `Theme: ${nextTheme === "dark" ? "Dark Mode" : "Light Mode"}`,
      message: `Switched to ${nextTheme} theme.`,
      variant: "info",
      duration: 2000,
    });
  };

  const toggleDeviceProfile = () => {
    const nextProfile = deviceProfile === "high-end" ? "low-profile" : "high-end";
    setDeviceProfile(nextProfile);
    addToast({
      title: `Device Mode: ${nextProfile === "high-end" ? "High-End Spec" : "Low-Profile Mobile"}`,
      message: nextProfile === "high-end" ? "Camera QR Scanner & video reticle enabled." : "Manual Entry Desk mode enabled for older hardware.",
      variant: "info",
      duration: 2500,
    });
  };

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

      {/* Floating Panel for changing Theme and Preview Profile */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-3 items-end">
        {/* High-End Device Profile Toggle Button (First) */}
        <button
          onClick={toggleDeviceProfile}
          className={`w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 group relative ${
            deviceProfile === "high-end" ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"
          }`}
          title={`Switch to ${deviceProfile === "high-end" ? "Low-Profile (for Older/Low-spec Mobiles)" : "High-End (Video QR Scan)"} mode`}
          aria-label="Toggle Device Profile"
        >
          {deviceProfile === "high-end" ? (
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          ) : (
            <Smartphone className="w-5 h-5 text-amber-400" />
          )}
          <span className="absolute right-12 top-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-850 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none md:block hidden">
            Device: {deviceProfile === "high-end" ? "High-End Spec (Camera On)" : "Low-Profile Mobile (Camera Off)"}
          </span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleThemeMode}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-lg shadow-black/20 text-[var(--text-primary)] transition-all hover:scale-105 active:scale-95 group relative"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle Theme Mode"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-400 group-hover:-rotate-12 transition-transform" />
          )}
          <span className="absolute right-12 top-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-850 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none md:block hidden">
            Theme: {theme === "dark" ? "Dark Mode" : "Light Mode"}
          </span>
        </button>
      </div>
    </div>
  );
}
