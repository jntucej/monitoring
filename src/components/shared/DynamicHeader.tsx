"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldCheck, ShieldAlert, ShieldQuestion, RefreshCw, User, LogOut } from "lucide-react";
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
  // Approver / leadership desks
  "/principal": "Principal Command Center",
  "/principal/attendance": "Institutional Attendance",
  "/principal/gate-activity": "Gate Activity Overview",
  "/principal/departments": "Department Performance",
  "/principal/incidents": "Incident Oversight",
  "/principal/reports": "Institutional Reports",
  "/principal/approvals": "Approvals and Decisions",
  "/principal/audit": "Audit and Compliance",
  "/principal/permissions": "Principal Approvals",
  "/vice-principal": "Vice Principal Desk",
  "/vice-principal/department-performance": "Department Performance",
  "/vice-principal/pending-approvals": "Pending Approvals",
  "/vice-principal/escalated-requests": "Escalated Requests",
  "/vice-principal/attendance-exceptions": "Attendance Exceptions",
  "/vice-principal/hostel-security-summaries": "Hostel & Security Summaries",
  "/vice-principal/examination-coordination": "Examination Coordination",
  "/vice-principal/delegated-responsibilities": "Delegated Responsibilities",
  "/vice-principal/decision-history": "Decision History",
  "/exam/permissions": "Exam Branch Permissions",
  "/exam-branch": "Exam Branch Dashboard",
  "/oie": "OIE Dashboard",
  "/deputy-warden": "Deputy Warden Dashboard",
  "/hostel-manager": "Hostel Manager Dashboard",
  "/hostel/permissions": "Hostel Approvals",
  "/hod": "HOD Workspace",
  "/hod/permissions": "HOD Approvals",
  "/faculty": "Faculty Dashboard",
  "/faculty/permissions": "Faculty Approvals",
  "/staff/leaves": "Staff Leave Approvals",
};

export function DynamicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, toggleMobileSidebar, addToast } = useUIStore();
  const { role, user, logout } = useAuthStore();
  const { college } = useCollegeInfo();
  const { wsConnected, securityMode, activeAlerts, gateTraffic } = useGlass();
  const [isOnline, setIsOnline] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Close the user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [userMenuOpen]);

  const goProfile = () => { setUserMenuOpen(false); router.push("/profile"); };
  const goSecurity = () => { setUserMenuOpen(false); router.push("/security"); };
  const doSignOut = () => {
    setUserMenuOpen(false);
    addToast({ title: "Signed out", message: "You have been securely signed out.", variant: "warning" });
    logout();
  };

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
        <h1 className="hidden md:block text-sm font-semibold text-[var(--text-primary)] truncate select-none">
          {title}
        </h1>
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

        {/* User menu — discoverable access to /profile, security and sign-out
            (replaces the old hidden triple-tap gesture) */}
        <div className="relative flex items-center gap-2 pl-1 border-l border-[var(--border)] shrink-0" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-[10px] sm:text-xs font-bold ring-1 ring-[var(--action-primary)]/30 transition-transform active:scale-95"
            title={`${user?.name || role || "User"} — open user menu`}
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : (role?.charAt(0).toUpperCase() || "U")}
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-9 sm:top-10 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-3 py-2.5 border-b border-[var(--border)]">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-[var(--text-muted)] capitalize truncate">{role || "—"}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={goProfile}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors text-left"
                >
                  <User className="w-4 h-4 text-[var(--text-muted)]" />
                  My Profile
                </button>
                <button
                  onClick={goSecurity}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
                  Security Center
                </button>
                <button
                  onClick={doSignOut}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
