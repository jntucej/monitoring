"use client";
import { errMsg } from "@/lib/err-msg";
import { useRouter } from "next/navigation";

// src/components/operator/profile/OperatorProfile.tsx
// Operator-specific copy of @/components/shared/UserProfileTab

import React from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { User, Mail, Shield, CheckCircle, Tag, LogOut, Smartphone, ShieldCheck } from "lucide-react";
import Link from "next/link";


export function OperatorProfile() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
const { addToast } = useUIStore();

  const handleLogout = async () => {
  const router = useRouter();
    try {
      await logout();
      addToast({
        title: "Signed Out",
        message: "You have been successfully signed out.",
        variant: "success",
      });
      router.push("/login");
    } catch (err) {
      addToast({
        title: "Error Signing Out",
        message: errMsg(err) || "Failed to sign out.",
        variant: "error",
      });
    }
  };












  if (!user) {
    return (
      <div className="surface-card p-6 text-center space-y-3 bg-bg-surface">
        <User className="size-6 text-text-muted mx-auto animate-pulse" />
        <h3 className="text-base font-bold">Profile Loading</h3>
        <p className="text-xs text-text-muted">Retrieving encrypted profile session...</p>
      </div>
    );
  }

  const userIdentifier = user.employeeId || user.id;

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Profile Card Header */}
      <div className="surface-card bg-bg-surface p-6 relative overflow-hidden">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-6 h-6 rounded-full bg-action-primary/10 text-action-primary border-2 border-action-primary/30 flex items-center justify-center text-3xl font-extrabold shadow-inner">
              {user.name ? user.name.charAt(0).toUpperCase() : (role?.charAt(0).toUpperCase() || "U")}
            </div>
            <div className="surface-card absolute -bottom-1 -right-1 bg-action-success text-black p-1" title="Account Active">
              <CheckCircle className="w-4 h-4 text-emerald-950 fill-emerald-400" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-text-primary">{user.name || "Operator"}</h2>
            <div className="surface-card flex items-center justify-center gap-1.5 px-3 py-1 bg-action-primary/10 text-xs font-semibold text-action-primary uppercase tracking-wider w-fit mx-auto">
              <Shield className="w-3.5 h-3.5" />
              <span>{role || "Visitor"}</span>
            </div>
          </div>
        </div>

        {/* Profile Card Details */}
        <div className="surface-card mt-8 pt-6 space-y-4">
          <div className="surface-card flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5 text-xs text-text-secondary font-medium">
              <Smartphone className="w-4 h-4 text-text-muted" />
              <span>ID / Roll Number</span>
            </div>
            <span className="font-mono text-sm font-bold text-text-primary">{userIdentifier}</span>
          </div>

          {user.email && (
            <div className="surface-card flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5 text-xs text-text-secondary font-medium">
                <Mail className="w-4 h-4 text-text-muted" />
                <span>Email Address</span>
              </div>
              <span className="text-xs font-medium text-text-primary max-w50 truncate">{user.email}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5 text-xs text-text-secondary font-medium">
              <Tag className="w-4 h-4 text-text-muted" />
              <span>Account Status</span>
            </div>
            <span className="text-xs font-bold text-action-success">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Sign Out Action Card */}
      <div className="surface-card bg-bg-surface p-4 space-y-3">
        <button
          onClick={handleLogout}
          className="surface-card w-full flex items-center gap-3 p-3 hover:bg-rose-500/10 text-action-danger hover: active:scale-[0.99] transition-all text-xs font-semibold text-left"
        >
          <LogOut className="w-4 h-4 text-action-danger" />
          <span>Sign Out of Device</span>
        </button>
      </div>

      {role === "student" && (
        <div className="pt-2">
          <Link
            href="/student/profile/privacy"
            className="surface-card inline-flex items-center gap-2 px-4 py-2 text-sm hover: transition-colors bg-[var(--bg-elevated,var(--bg-surface))] text-text-primary"
          >
            <ShieldCheck className="w-4 h-4 text-action-success" />
            Privacy & Access Matrix
          </Link>
        </div>
      )}
    </div>
  );
}
