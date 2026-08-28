"use client";

import { useEffect, useState } from "react";
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
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useRoles } from "@/hooks/useRoles";
import type { Role } from "@/lib/types";
import { getDefaultRouteForRole } from "@/lib/route-helpers";

interface LoginFormProps {
  role: Role | "all";
  title: string;
  subtitle: string;
}

function formatLoginError(code?: string, defaultMsg?: string): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Invalid username or password.";
    case "ACCOUNT_INACTIVE":
      return "Your account is inactive. Contact support.";
    case "MFA_REQUIRED":
      return "Two-factor authentication is required. Please set it up in your security settings.";
    case "SESSION_EXPIRED":
      return "Your session expired. Please log in again.";
    default:
      if (defaultMsg === "Invalid credentials") return "Invalid username or password.";
      return defaultMsg || "Invalid credentials.";
  }
}

export function LoginForm({ role, title, subtitle }: LoginFormProps) {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { user, authenticated, login, pinLogin, loading } = useAuthStore();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hasHydrated && authenticated && user) {
      redirectAfterLogin(user.role);
    }
  }, [hasHydrated, authenticated, user]);

  const { roles: fetchedRoles } = useRoles();
  const roles = fetchedRoles.length > 0
    ? fetchedRoles.map((r) => ({
        name: r.display_name,
        path: r.code === 'admin' ? '/login/admin' : r.code === 'operator' ? '/login/operator' : r.code === 'guardian' || r.code === 'parent' ? '/login/guardian' : `/login/${r.code}`,
      }))
    : [
        { name: 'Admin', path: '/login/admin' },
        { name: 'Operator', path: '/login/operator' },
        { name: 'Guardian', path: '/login/guardian' },
        { name: 'Users', path: '/login/student' },
      ];

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [passwordOrPin, setPasswordOrPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const json = await res.json();
      setResetMsg(json.data?.message || "Password reset instructions sent.");
    } catch {
      setResetMsg("Failed to send reset email. Try again later.");
    } finally {
      setResetLoading(false);
    }
  };

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

    const isPurePin = /^\d{4,8}$/.test(passwordOrPin);

    if (isPurePin || role === "operator") {
      const pinResult = await pinLogin(identifier, passwordOrPin);
      if (pinResult.success) {
        if (rememberMe) {
          localStorage.setItem("gate-monitor-remember", "true");
        }
        addToast({
          title: "Access Granted",
          message: `Authenticated via Security PIN.`,
          variant: "success",
        });
        const authStore = useAuthStore.getState();
        redirectAfterLogin(authStore.role);
        return;
      }

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
        const authStore = useAuthStore.getState();
        redirectAfterLogin(authStore.role);
        return;
      }

      triggerShake(formatLoginError(pinResult.code || result.code, pinResult.error || result.error));
      return;
    } else {
      const result = await login(identifier, passwordOrPin);

      // SECURITY: sysadmins must complete TOTP enrollment before they can sign in.
      if (!result.success && result.code === "MFA_REQUIRED") {
        triggerShake(formatLoginError("MFA_REQUIRED"));
        router.push("/sysadmin/security");
        return;
      }

      if (result.success) {
        if (rememberMe) {
          localStorage.setItem("gate-monitor-remember", "true");
        }
        addToast({
          title: "Access Granted",
          message: `Authenticated successfully.`,
          variant: "success",
        });
        const authStore = useAuthStore.getState();
        redirectAfterLogin(authStore.role);
        return;
      }

      triggerShake(formatLoginError(result.code, result.error));
      return;
    }
  };

  // Helper function to redirect based on role after successful login
  const redirectAfterLogin = async (role: Role | null) => {
    switch (role) {
      case "operator": {
        const authStore = useAuthStore.getState();
        const user = authStore.user;
        console.log("LoginForm Redirecting Operator user:", JSON.stringify(user));
        if (user?.gateId) {
          router.push(`/gate/${user.gateId}`);
        } else {
          try {
            const token = authStore.token;
            const res = await fetch("/api/gates", {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            const body = await res.json();
            if (body.success && Array.isArray(body.data) && body.data.length > 0) {
              const activeGate = body.data.find((g: any) => g.is_active || g.isActive) || body.data[0];
              router.push(`/gate/${activeGate.id}`);
            } else {
              router.push("/");
            }
          } catch (err) {
            console.error("Failed to fetch gates for operator redirection:", err);
            router.push("/");
          }
        }
        break;
      }

      case "admin":
        router.push("/admin");
        break;
      case "sysadmin":
        router.push("/sysadmin");
        break;
      case "supervisor":
      case "warden":
        router.push("/supervisor");
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
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Password or Security PIN
            </label>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-[11px] font-semibold text-sky-400 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
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

        <a
          href="/api/auth/sso"
          className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-xs hover:bg-[var(--bg-base)] transition-all flex items-center justify-center gap-2 py-2.5 mt-2"
        >
          <span>Sign In with Campus SSO / OIDC</span>
        </a>
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

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white">Reset Password</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Enter your registered email address to receive password reset instructions.
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <input
                type="email"
                required
                placeholder="name@college.edu"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm focus:outline-none text-white"
              />
              {resetMsg && (
                <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-lg text-xs font-medium">
                  {resetMsg}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setResetMsg(null); }}
                  className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
