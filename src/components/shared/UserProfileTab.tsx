"use client";

import React from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useCollegeInfo } from "@/hooks/useCollegeInfo";
import { User, Mail, Shield, CheckCircle, Tag, LogOut, Moon, Sun, School, Smartphone } from "lucide-react";

export function UserProfileTab() {
  const { user, role, logout } = useAuthStore();
  const { theme, setTheme, deviceProfile, setDeviceProfile, addToast } = useUIStore();
  const { college } = useCollegeInfo();

  const handleLogout = async () => {
    try {
      await logout();
      addToast({
        title: "Signed Out",
        message: "You have been successfully signed out.",
        variant: "success",
      });
      window.location.href = "/login";
    } catch (err: any) {
      addToast({
        title: "Error Signing Out",
        message: err.message || "Failed to sign out.",
        variant: "error",
      });
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    addToast({
      title: "Theme Changed",
      message: `Switched to ${nextTheme.toUpperCase()} mode`,
      variant: "info",
      duration: 1500,
    });
  };

  const toggleDeviceProfile = () => {
    const nextProfile = deviceProfile === "high-end" ? "low-profile" : "high-end";
    setDeviceProfile(nextProfile);
    addToast({
      title: `Device Mode: ${nextProfile === "high-end" ? "High-End Spec" : "Low-Profile Mobile"}`,
      message: nextProfile === "high-end" ? "Camera QR Scanner active first." : "Manual Entry Desk active first for older devices.",
      variant: "info",
      duration: 2000,
    });
  };

  if (!user) {
    return (
      <div className="p-6 text-center space-y-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
        <User className="w-12 h-12 text-[var(--text-muted)] mx-auto animate-pulse" />
        <h3 className="text-base font-bold">Profile Loading</h3>
        <p className="text-xs text-[var(--text-muted)]">Retrieving encrypted profile session...</p>
      </div>
    );
  }

  // Derived label or identifier
  const userIdentifier = user.employeeId || user.id;

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Profile Card Header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--action-primary)]/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[var(--action-primary)]/10 text-[var(--action-primary)] border-2 border-[var(--action-primary)]/30 flex items-center justify-center text-3xl font-extrabold shadow-inner">
              {user.name ? user.name.charAt(0).toUpperCase() : (role?.charAt(0).toUpperCase() || "U")}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full border-2 border-[var(--bg-surface)]" title="Account Active">
              <CheckCircle className="w-4 h-4 text-emerald-950 fill-emerald-400" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{user.name || "Campus User"}</h2>
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 text-xs font-semibold text-[var(--action-primary)] uppercase tracking-wider w-fit mx-auto">
              <Shield className="w-3.5 h-3.5" />
              <span>{role || "Visitor"}</span>
            </div>
          </div>
        </div>

        {/* Profile Card Details */}
        <div className="mt-8 border-t border-[var(--border)] pt-6 space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-[var(--border)]/50">
            <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-medium">
              <Smartphone className="w-4 h-4 text-[var(--text-muted)]" />
              <span>ID / Roll Number</span>
            </div>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{userIdentifier}</span>
          </div>

          {user.email && (
            <div className="flex items-center justify-between py-2 border-b border-[var(--border)]/50">
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-medium">
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Email Address</span>
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)] max-w-[200px] truncate">{user.email}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-b border-[var(--border)]/50">
            <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-medium">
              <School className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Institution</span>
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)]">{college?.shortName || "College"}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-medium">
              <Tag className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Account Status</span>
            </div>
            <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Theme and Actions Panel */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-md">
        <button
          onClick={toggleDeviceProfile}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-elevated)] active:scale-[0.99] transition-all text-xs font-semibold text-[var(--text-primary)] border border-[var(--border)]/40"
        >
          <div className="flex items-center gap-3">
            <Smartphone className={`w-5 h-5 ${deviceProfile === "high-end" ? "text-emerald-400" : "text-amber-400"}`} />
            <span>Hardware Mode: {deviceProfile === "high-end" ? "High-End (Camera)" : "Low-Profile (Manual)"}</span>
          </div>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${deviceProfile === "high-end" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"}`}>
            {deviceProfile === "high-end" ? "High-End First" : "Low-Profile First"}
          </span>
        </button>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-elevated)] active:scale-[0.99] transition-all text-xs font-semibold text-[var(--text-primary)]"
        >
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <>
                <Sun className="w-5 h-5 text-amber-400" />
                <span>Switch to Light Theme</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-indigo-400" />
                <span>Switch to Dark Theme</span>
              </>
            )}
          </div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
            {theme === "dark" ? "Dark Mode" : "Light Mode"}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 text-rose-400 border border-transparent hover:border-rose-500/20 active:scale-[0.99] transition-all text-xs font-semibold text-left"
        >
          <LogOut className="w-5 h-5 text-rose-450" />
          <span>Sign Out of Device</span>
        </button>
      </div>
    </div>
  );
}
