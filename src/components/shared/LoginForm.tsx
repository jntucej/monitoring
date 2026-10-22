"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { Role } from "@/lib/types";
import { getDefaultRouteForRole } from "@/lib/route-helpers";

interface LoginFormProps {
  title: string;
  subtitle: string;
}

function formatLoginError(code?: string, defaultMsg?: string): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Invalid username or password.";
    case "ACCOUNT_INACTIVE":
      return "Your account is inactive. Contact support.";
    case "SESSION_EXPIRED":
      return "Your session expired. Please log in again.";
    default:
      if (defaultMsg === "Invalid credentials") return "Invalid username or password.";
      return defaultMsg || "Invalid credentials.";
  }
}

export function LoginForm({ title, subtitle }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHydrated = useHasHydrated();
  const { user, authenticated, login, loading } = useAuthStore();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);

  // Unified redirect: after login, route each role to its default dashboard.
  // Reuses the shared route helper (ponytail: don't duplicate the 60-line switch).
  const redirectAfterLogin = useCallback(
    (role: Role | null) => {
      const override = searchParams?.get("redirect");
      if (override && override.startsWith("/")) {
        router.push(override);
        return;
      }
      if (!role) {
        router.push("/");
        return;
      }
      if (role === "operator") {
        const authStore = useAuthStore.getState();
        const u = authStore.user;
        if (u?.gateId) {
          router.push(`/gate/${u.gateId}`);
          return;
        }
        // No assigned gate — pick the first active gate from the API.
        fetch("/api/gates", {
          headers: { Authorization: `Bearer ${authStore.token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((body) => {
            if (body?.success && Array.isArray(body.data) && body.data.length > 0) {
              const activeGate = body.data.find((g: { is_active?: boolean; isActive?: boolean }) => g.is_active || g.isActive) || body.data[0];
              router.push(`/gate/${activeGate.id}`);
            } else {
              router.push("/");
            }
          })
          .catch((err) => {
            console.error("Failed to fetch gates for operator redirection:", err);
            router.push("/");
          });
        return;
      }
      router.push(getDefaultRouteForRole(role));
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (hasHydrated && authenticated && user) {
      redirectAfterLogin(user.role);
    }
  }, [hasHydrated, authenticated, user, redirectAfterLogin]);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
    if (!password) {
      triggerShake("Please enter your Password.");
      return;
    }

    // Password path
    const result = await login(identifier, password);

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem("gate-monitor-remember", "true");
      }
      addToast({
        title: "Access Granted",
        message: `Authenticated successfully.`,
        variant: "success",
      });
      // ponytail: no redirect here — the hasHydrated+authenticated effect
      // above routes once persist has settled (avoids AuthGuard race).
      return;
    } else {
      triggerShake(formatLoginError(result.code, result.error));
    }
  };

  return (
    <div
      className={`glass-card w-full max-w-lg p-6 sm:p-8 rounded-3xl space-y-6 transition-all border border-slate-800/50 shadow-2xl ${
        isShaking ? "animate-shake border-[var(--action-danger)]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
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

      <form onSubmit={handleFormSubmit} className="space-y-4" autoComplete="off">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            User ID / Identifier
          </label>
          <div className="relative">
            <input
              type="text"
              autoComplete="username"
              value={loginIdentifier}
              onChange={(e) => { setLoginIdentifier(e.target.value); if (errorMsg) setErrorMsg(""); }}
              placeholder="Enter ID"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none transition-all"
            />
            <UserCheck className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Password
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errorMsg) setErrorMsg(""); }}
              placeholder="Enter password"
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
          disabled={loading || !loginIdentifier || !password}
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
