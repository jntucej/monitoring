"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, Sun, Moon, Bell, ShieldCheck, LogOut, Wifi } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

const PAGE_TITLES: Record<string, string> = {
  "/gate/1": "Gate 1 Mobile Scanner Desk",
  "/gate/2": "Gate 2 Mobile Scanner Desk",
  "/supervisor/live": "Real-Time Campus Feed",
  "/supervisor/corrections": "Supervisor Corrections",
  "/admin": "Campus Overview Dashboard",
  "/admin/students": "Student Master Roster",
  "/admin/alerts": "Security Alerts",
  "/admin/reports": "Gate Analytics",
  "/sysadmin": "System Administration",
  "/parent": "Parent Student Tracker",
  "/student": "Digital ID & Pass Desk",
};

export function DynamicHeader() {
  const pathname = usePathname();
  const { theme, setTheme, toggleMobileSidebar, addToast } = useUIStore();
  const { role, user, logout } = useAuthStore();
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const title = PAGE_TITLES[pathname] || "JNTUH CEJ Gate Monitor";

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
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const isMobileRole = role === "student" || role === "operator" || role === "parent";

  return (
    <header className={`h-14 sm:h-16 sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between backdrop-blur-xl bg-[var(--bg-surface)]/80 border-b border-[var(--border)] select-none ${isMobileRole ? "hidden md:flex" : "flex"}`}>
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-all active:scale-95"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug tracking-tight">
            {title}
          </h1>
          <p className="text-[10px] text-[var(--text-muted)] hidden sm:block">
            JNTUH CEJ, Jagtial
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Hidden Triple Tap Logout Trigger Target */}
        <div
          onClick={handleSecretTripleTap}
          className="p-1 rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)]"
          title="Security Badge (Triple-tap to logout)"
        >
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline capitalize">{role || "Secured"}</span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-all active:scale-95"
          title="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Quick User Avatar */}
        <div className="flex items-center gap-2 pl-1 border-l border-[var(--border)]">
          <div className="w-7 h-7 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-xs font-bold ring-1 ring-[var(--action-primary)]/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : (role?.charAt(0).toUpperCase() || "U")}
          </div>
        </div>
      </div>
    </header>
  );
}
