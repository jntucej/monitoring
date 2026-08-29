"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, ShieldCheck, LogOut, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useCollegeInfo } from "@/hooks/useCollegeInfo";
import { useGlass } from "@/context/GlassContext";
import { GlassThemeToggle } from "./GlassThemeToggle";

const PAGE_TITLES: Record<string, string> = {
  "/gate/1": "Mobile Scanner Desk",
  "/gate/2": "Mobile Scanner Desk",
  "/admin": "Campus Dashboard",
  "/admin/students": "Student Roster",
  "/admin/faculty": "Attendance & Heatmap",
  "/admin/staff": "Oversight & Movement Logs",
  "/admin/workers": "Shift & Presence Tracker",
  "/admin/alerts": "Security Alerts",
  "/admin/reports": "Gate Analytics",
  "/sysadmin": "Administration",
  "/parent": "Parent Student Tracker",
  "/student": "Digital ID & Pass Desk",
};

export function DynamicHeader() {
  const pathname = usePathname();
  const { theme, setTheme, toggleMobileSidebar, addToast } = useUIStore();
  const { role, user, logout } = useAuthStore();
  const { college } = useCollegeInfo();
  const { wsConnected } = useGlass();
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOn = () => setIsOnline(true);
      const handleOff = () => setIsOnline(false);
      window.addEventListener("online", handleOn);
      window.addEventListener("offline", handleOff);
      return () => {
        window.removeEventListener("online", handleOn);
        window.removeEventListener("offline", handleOff);
      };
    }
  }, []);

  const title = PAGE_TITLES[pathname] || `${college?.shortName || "College"} Gate Monitor`;

  // Secret Triple-tap gesture on top-right area to instantly logout
  const handleSecretTripleTap = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        addToast({
          title: "Quick Sign Out",
          message: "Triple-tap gesture recognized. Logging out...",
          variant: "warning",
        });
        logout();
        return 0;
      }
      return next;
    });

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      setTapCount(0);
    }, 600);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "glass" : theme === "glass" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <header className="relative h-14 sm:h-16 sticky top-0 z-40 px-2 sm:px-6 flex items-center justify-between gap-2 bg-transparent border-b border-[var(--border)] select-none">
      {/* Inner backdrop glass layer for iOS Safari chrome tint optimization */}
      <div 
        className="absolute inset-0 -z-10 pointer-events-none backdrop-blur-xl bg-[var(--glass-bg,var(--bg-surface))]"
        style={{
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          backdropFilter: "blur(24px) saturate(200%)",
        }}
      />
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-1.5 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-all active:scale-95 shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xs sm:text-base font-bold text-[var(--text-primary)] leading-snug tracking-tight truncate">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Network Status Dot / Badge */}
        <div 
          className="network-status px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 sm:gap-1.5 backdrop-blur-md"
          title={isOnline ? "Network Status: Online" : "Network Status: Offline"}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="hidden md:inline">Online</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-rose-400 hidden md:inline">Offline</span>
            </>
          )}
        </div>

        {/* WebSocket Connection Reconnecting Indicator */}
        {!wsConnected && (
          <div 
            className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 sm:gap-1.5 backdrop-blur-md animate-pulse"
            title="Reconnecting WebSocket..."
          >
            <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
            <span className="hidden md:inline">Reconnecting WS…</span>
          </div>
        )}

        {/* Hidden Triple Tap Logout Trigger Target */}
        <div
          onClick={handleSecretTripleTap}
          className="p-0.5 sm:p-1 rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)]"
          title={`Role Badge: ${role || "Secured"} (Triple-tap to logout)`}
        >
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 text-[10px] sm:text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline capitalize">{role || "Secured"}</span>
          </div>
        </div>

        {/* Glass & Appearance Theme Toggle */}
        <GlassThemeToggle showCard={false} />

        {/* Quick User Avatar */}
        <div className="flex items-center gap-2 pl-1 border-l border-[var(--border)] shrink-0">
          <div 
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-[10px] sm:text-xs font-bold ring-1 ring-[var(--action-primary)]/30"
            title={user?.name || role || "User"}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : (role?.charAt(0).toUpperCase() || "U")}
          </div>
        </div>
      </div>
    </header>
  );
}
