"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  Users,
  KeyRound,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Role } from "@/lib/types";

const ROLE_REDIRECTS: Record<Role, string> = {
  operator: "/gate/1",
  supervisor: "/supervisor/live",
  admin: "/admin",
  sysadmin: "/sysadmin",
  parent: "/parent",
  student: "/student",
  warden: "/sysadmin",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, pinLogin, loading } = useAuthStore();
  const { addToast } = useUIStore();

  const [loginMode, setLoginMode] = useState<"employee" | "student" | "parent">("employee");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [passwordOrPin, setPasswordOrPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      triggerShake("Please enter your Employee / Staff ID.");
      return;
    }
    if (!passwordOrPin) {
      triggerShake("Please enter your security Password / PIN.");
      return;
    }

    // Attempt primary auth login
    const result = await login(identifier, passwordOrPin);
    if (result.success) {
      const userRole = useAuthStore.getState().role || "operator";
      if (rememberMe) {
        localStorage.setItem("gate-monitor-remember", "true");
      }
      addToast({
        title: "Access Granted",
        message: `Welcome! Authenticated securely as ${userRole.toUpperCase()}.`,
        variant: "success",
      });
      router.push(ROLE_REDIRECTS[userRole as Role] || "/gate/1");
      return;
    }

    // Secondary fallback for pin-based staff auth
    const pinResult = await pinLogin(identifier, passwordOrPin);
    if (pinResult.success) {
      const userRole = useAuthStore.getState().role || "operator";
      addToast({
        title: "Access Granted",
        message: `Authenticated via Staff PIN authority.`,
        variant: "success",
      });
      router.push(ROLE_REDIRECTS[userRole as Role] || "/gate/1");
    } else {
      triggerShake(result.error || pinResult.error || "Invalid Staff credentials.");
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const upperRoll = loginIdentifier.trim().toUpperCase();
    const parsed = parseRollNumber(upperRoll);

    if (!parsed && upperRoll.length > 0) {
      triggerShake("Invalid JNTUH Roll Number format (e.g. 24JJ1A0501).");
      return;
    }

    if (!upperRoll || !passwordOrPin) {
      triggerShake("Please enter your Roll Number and Password / PIN.");
      return;
    }

    const result = await login(upperRoll, passwordOrPin);
    if (result.success) {
      const userRole = useAuthStore.getState().role || "student";
      addToast({
        title: "Student Verified",
        message: `Welcome ${upperRoll}! Access granted.`,
        variant: "success",
      });
      router.push(ROLE_REDIRECTS[userRole as Role] || "/student");
    } else {
      const resultPin = await pinLogin(upperRoll, passwordOrPin);
      if (resultPin.success) {
        router.push("/student");
      } else {
        triggerShake(result.error || "Unable to verify Student credentials.");
      }
    }
  };

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!loginIdentifier || !passwordOrPin) {
      triggerShake("Please enter Email/Phone and Password.");
      return;
    }

    const result = await login(loginIdentifier, passwordOrPin);
    if (result.success) {
      const userRole = useAuthStore.getState().role || "parent";
      addToast({
        title: "Parent Portal Access",
        message: "Signed in successfully.",
        variant: "success",
      });
      router.push(ROLE_REDIRECTS[userRole as Role] || "/parent");
    } else {
      triggerShake(result.error || "Invalid credentials for Parent portal.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-6 select-none">
      <div
        className={`w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 transition-transform ${
          isShaking ? "animate-shake border-[var(--action-danger)]" : ""
        }`}
      >
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 mb-1">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            JNTUH UCoEJ Gate Monitor
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-medium">
            Authoritative Role-Based Gateway — Valid Credentials Required
          </p>
        </div>

        {/* Login Mode Selector Tabs */}
        <div className="grid grid-cols-3 p-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setLoginMode("employee");
              setErrorMsg("");
              setLoginIdentifier("");
              setPasswordOrPin("");
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              loginMode === "employee"
                ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Staff</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode("student");
              setErrorMsg("");
              setLoginIdentifier("");
              setPasswordOrPin("");
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              loginMode === "student"
                ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode("parent");
              setErrorMsg("");
              setLoginIdentifier("");
              setPasswordOrPin("");
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              loginMode === "parent"
                ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Parent</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--action-danger)]/10 text-[var(--action-danger)] border border-[var(--action-danger)]/20 text-xs font-semibold animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Staff Login Form */}
        {loginMode === "employee" && (
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Employee / Guard ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value.toUpperCase())}
                  placeholder="e.g. OP001, SV001, AD001"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                />
                <UserCheck className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Password or Security PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordOrPin}
                  onChange={(e) => setPasswordOrPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                />
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !loginIdentifier || !passwordOrPin}
              className="w-full touch-target-primary rounded-xl bg-[var(--action-primary)] text-white font-bold text-sm hover:opacity-95 transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? "Authenticating Staff..." : "Sign In to Terminal"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Student Form */}
        {loginMode === "student" && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                JNTUH Roll Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={10}
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value.toUpperCase())}
                  placeholder="e.g. 24JJ1A0501"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm font-mono tracking-widest uppercase font-bold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                />
                <GraduationCap className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Student Passcode / Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordOrPin}
                  onChange={(e) => setPasswordOrPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                />
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !loginIdentifier || !passwordOrPin}
              className="w-full touch-target-primary rounded-xl bg-[var(--action-primary)] text-white font-bold text-sm hover:opacity-95 transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? "Authenticating Student..." : "Access Digital ID"}
              <GraduationCap className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Parent Form */}
        {loginMode === "parent" && (
          <form onSubmit={handleParentSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Parent Email or Mobile Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. parent@example.com or 9876543210"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                />
                <Users className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Account Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordOrPin}
                  onChange={(e) => setPasswordOrPin(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                />
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !loginIdentifier || !passwordOrPin}
              className="w-full touch-target-primary rounded-xl bg-[var(--action-primary)] text-white font-bold text-sm hover:opacity-95 transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? "Verifying Parent..." : "Enter Parent Portal"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Remember Me Session Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--action-primary)] focus:ring-[var(--focus-ring)] accent-[var(--action-primary)]"
            />
            <span>Remember session</span>
          </label>
          <span className="text-[10px] font-mono text-[var(--action-primary)] font-semibold">
            Supabase Auth
          </span>
        </div>
      </div>
    </div>
  );
}
