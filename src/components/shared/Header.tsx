"use client";

import { Menu, Sun, Moon, ShieldCheck, CheckCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

const PAGE_TITLES: Record<string, string> = {
  "/gate/1": "Gate 1 Scanner — High Speed Scanner Desk",
  "/gate/2": "Gate 2 Scanner — High Speed Scanner Desk",
  "/admin": "Campus Overview Dashboard",
  "/admin/students": "Student Master Roster",
  "/admin/alerts": "Security & Anomaly Alerts",
  "/admin/reports": "Gate Entry/Exit Analytics",
  "/sysadmin": "System Administration & Settings",
  "/parent": "Parent Dashboard — Student Tracking",
  "/student": "Digital ID & Gate Pass Management",
};

import { useCollegeInfo } from "@/hooks/useCollegeInfo";

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme, toggleMobileSidebar, addToast } = useUIStore();
  const { role, user } = useAuthStore();
  const { college } = useCollegeInfo();

  const title = PAGE_TITLES[pathname] || `${college?.shortName || "College"} Gate Monitor`;

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    addToast({
      title: "Theme Changed",
      message: `Switched to ${nextTheme.toUpperCase()} mode`,
      variant: "info",
      duration: 2000,
    });
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[var(--bg-surface)] border-b border-[var(--border)] sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          title="Open Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">
            {title}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
            {college?.shortName || "College"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Security / Connection Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Encrypted Gateway</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={handleToggleTheme}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle dark/light theme"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>

        {/* Real Notification Bell */}
        <NotificationBell />
      </div>
    </header>
  );
}
