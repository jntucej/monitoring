"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  UserCheck,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import type { Role } from "@/lib/types";

interface LoginFormProps {
  role: Role;
  title: string;
  subtitle: string;
}

export function LoginForm({ role, title, subtitle }: LoginFormProps) {
  const router = useRouter();
  const { login, pinLogin, loading } = useAuthStore();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);

  const roles = [
    { name: 'Admin', path: '/login/admin' },
    { name: 'Operator', path: '/login/operator' },
    { name: 'Guardian', path: '/login/guardian' },
    { name: 'Users', path: '/login/student' },
    { name: 'Supervisor', path: '/login/supervisor' },
  ];

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const identifier = loginIdentifier.trim().toUpperCase(); // Convert to uppercase for consistency
    if (!identifier) {
      triggerShake("Please enter your ID.");
      return;
    }
    if (!passwordOrPin) {
      triggerShake("Please enter your Password or Security PIN.");
      return;
    }

    // Role-specific login? The current AuthStore doesn't seem to enforce role strictly at login, 
    // it probably checks or relies on user.role after login.
    // For now, let's keep the logic as is.

    const result = await login(identifier, passwordOrPin);
    if (result.success) {
      if (rememberMe) {
        localStorage.setItem("gate-monitor-remember", "true");
      }
      addToast({
        title: "Access Granted",
        message: `Authenticated successfully.`,
        variant: "success",
      });
      // Redirect based on role
      const authStore = useAuthStore.getState();
      const userRole = authStore.role;
      redirectAfterLogin(userRole);
      return;
    }

    const pinResult = await pinLogin(identifier, passwordOrPin);
    if (pinResult.success) {
      addToast({
        title: "Access Granted",
        message: `Authenticated via Security PIN.`,
        variant: "success",
      });
      const authStore = useAuthStore.getState();
      const userRole = authStore.role;
      redirectAfterLogin(userRole);
      return;
    } else {
      triggerShake(result.error || pinResult.error || "Invalid credentials.");
    }
  };

  // Helper function to redirect based on role after successful login
  const redirectAfterLogin = (role: Role | null) => {
    switch (role) {
      case "operator":
        router.push("/gate/1"); // Default to gate 1
        break;
      case "supervisor":
        router.push("/supervisor/live");
        break;
      case "admin":
      case "sysadmin":
        router.push("/admin/dashboard");
        break;
      case "faculty":
        router.push("/faculty");
        break;
      case "staff":
        router.push("/staff");
        break;
      case "worker":
        router.push("/worker");
        break;
      case "student":
        router.push("/student");
        break;
      case "guardian":
        router.push("/guardian");
        break;
      case "visitor":
        router.push("/visitor");
        break;
      default:
        router.push("/");
    }
  };

  return (
    <div
      className={`glass-card w-full max-w-lg p-6 sm:p-8 rounded-3xl space-y-6 transition-all border border-slate-800/50 shadow-2xl ${
        isShaking ? "animate-shake border-[var(--action-danger)]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <Link href="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <div className="text-xs text-[var(--text-muted)]">
          Switch: 
          <select 
            onChange={(e) => router.push(e.target.value)} 
            className="ml-2 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2"
            value={`/login/${role}`}
          >
            {roles.map(r => <option key={r.name} value={r.path}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="text-xs text-[var(--text-muted)] font-medium max-w-xs mx-auto">
          {subtitle}
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--action-danger)]/10 text-[var(--action-danger)] border border-[var(--action-danger)]/20 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            User ID / Identifier
          </label>
          <div className="relative">
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="Enter your identifier"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none transition-all"
            />
            <UserCheck className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            Password or Security PIN
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={passwordOrPin}
              onChange={(e) => setPasswordOrPin(e.target.value)}
              placeholder="Enter password or PIN"
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none transition-all"
            />
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none transition-colors p-0.5"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !loginIdentifier || !passwordOrPin}
          className="w-full touch-target-primary rounded-xl bg-[var(--action-primary)] text-white font-bold text-sm hover:opacity-95 transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2 py-3 mt-2 active:scale-[0.99]"
        >
          {loading ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded text-[var(--action-primary)] focus:ring-[var(--focus-ring)] accent-[var(--action-primary)]"
          />
          <span>Remember login</span>
        </label>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--action-primary)] font-bold">
          <ShieldAlert className="w-3 h-3" />
          <span>Encrypted Authorization</span>
        </span>
      </div>
    </div>
  );
}
