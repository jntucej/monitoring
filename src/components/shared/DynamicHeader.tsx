"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldCheck, ShieldAlert, ShieldQuestion, RefreshCw } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useCollegeInfo } from "@/hooks/useCollegeInfo";
import { useGlass, SecurityMode } from "@/context/GlassContext";
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
  const router = useRouter();
  const { theme, setTheme, toggleMobileSidebar, addToast } = useUIStore();
  const { role, user, logout } = useAuthStore();
  const { college } = useCollegeInfo();
  const { wsConnected, securityMode, activeAlerts, gateTraffic } = useGlass();
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

  // Mode-aware shield: color/label reflects live security posture.
  const SECURITY_MODE_CONFIG: Record<
    SecurityMode,
    { icon: typeof ShieldCheck; label: string; badgeCls: string; iconCls: string; title: string }
  > = {
    secure: {
      icon: ShieldCheck,
      label: "Secured",
      badgeCls: "bg-[var(--action-primary)]/10 text-[var(--action-primary)] border-[var(--action-primary)]/20",
      iconCls: "",
      title: "Connections protected. Everything nominal.",
    },
    elevated: {
      icon: ShieldQuestion,
      label: "Elevated",
      badgeCls: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
      iconCls: "text-amber-400",
      title: "Higher-than-average traffic or open alerts. Extra monitoring active.",
    },
    critical: {
      icon: ShieldAlert,
      label: "Critical",
      badgeCls: "bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse",
      iconCls: "text-rose-400",
      title: "Security posture raised — possible attack surface. Tap for details.",
    },
  };

  const mode = securityMode in SECURITY_MODE_CONFIG ? securityMode : "secure";
  const SecurityIcon = SECURITY_MODE_CONFIG[mode].icon;

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
      </div>

      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Offline Network Warning Badge — only shown if browser is offline */}
        {!isOnline && (
          <div 
            className="network-status px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 sm:gap-1.5 backdrop-blur-md"
            title="Network Status: Offline"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="hidden md:inline">Offline</span>
          </div>
        )}

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

        {/* Mode-aware Security Posture Button → /security */}
        <button
          onClick={() => router.push("/security")}
          className="p-0.5 sm:p-1 rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)] shrink-0"
          title={`${SECURITY_MODE_CONFIG[mode].title} Tap to open security page.${wsConnected ? " Live protected." : ""}`}
          aria-label={`Security status: ${SECURITY_MODE_CONFIG[mode].label}`}
        >
          <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold border ${SECURITY_MODE_CONFIG[mode].badgeCls}`}>
            <SecurityIcon className={`w-3.5 h-3.5 shrink-0 ${SECURITY_MODE_CONFIG[mode].iconCls}`} />
            <span className="hidden md:inline">{SECURITY_MODE_CONFIG[mode].label}</span>
          </div>
        </button>

        {/* Glass & Appearance Theme Toggle */}
        <GlassThemeToggle showCard={false} />

        {/* Quick User Avatar (triple-tap = quick sign out) */}
        <div className="flex items-center gap-2 pl-1 border-l border-[var(--border)] shrink-0">
          <button
            onClick={handleSecretTripleTap}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-[10px] sm:text-xs font-bold ring-1 ring-[var(--action-primary)]/30 transition-transform active:scale-95"
            title={`${user?.name || role || "User"} — Triple-tap to sign out`}
            aria-label="User menu. Tap repeatedly to sign out"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : (role?.charAt(0).toUpperCase() || "U")}
          </button>
        </div>
      </div>
    </header>
  );
}
