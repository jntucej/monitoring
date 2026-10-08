"use client";

import { useCallback, useEffect, useState } from "react";
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
    case "INVALID_PIN":
      return "Invalid PIN or user not found.";
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

export function LoginForm({ title, subtitle }: LoginFormProps) {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { user, authenticated, login, pinLogin, loading } = useAuthStore();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);

  // Unified redirect: after login, route each role to its default dashboard.
  // Reuses the shared route helper (ponytail: don't duplicate the 60-line switch).
  const redirectAfterLogin = useCallback(
    (role: Role | null) => {
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
    [router]
  );

  useEffect(() => {
    if (hasHydrated && authenticated && user) {
      redirectAfterLogin(user.role);
    }
  }, [hasHydrated, authenticated, user, redirectAfterLogin]);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [passwordOrPin, setPasswordOrPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  // Two-leg MFA login: set after password leg succeeds, cleared on completion
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

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

    const isPurePin = /^\d{4,8}$/.test(passwordOrPin);

    if (isPurePin) {
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

      // Fallback: If numeric input wasn't a valid PIN, attempt standard password login
      // (e.g. numeric passwords, admin/sysadmin roles, or multi-factor challenges)
      const fallbackResult = await login(
        identifier,
        passwordOrPin,
        mfaChallenge ? { challenge: mfaChallenge, totpCode } : undefined
      );

      if (fallbackResult.success) {
        setMfaChallenge(null);
        setTotpCode("");
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

      if (fallbackResult.code === "MFA_REQUIRED" || fallbackResult.mfaEnrollmentRequired) {
        triggerShake(formatLoginError("MFA_REQUIRED"));
        router.push("/sysadmin/security");
        return;
      }

      if (fallbackResult.mfaRequired && fallbackResult.mfaChallenge) {
        setMfaChallenge(fallbackResult.mfaChallenge);
        triggerShake("Enter the 6-digit code from your authenticator app.");
        return;
      }

      triggerShake(formatLoginError(fallbackResult.code || pinResult.code, fallbackResult.error || pinResult.error));
      return;
    } else {
      const result = await login(
        identifier,
        passwordOrPin,
        mfaChallenge ? { challenge: mfaChallenge, totpCode } : undefined
      );

      // SECURITY: sysadmins must complete TOTP enrollment before they can sign in.
      if (!result.success && (result.code === "MFA_REQUIRED" || result.mfaEnrollmentRequired)) {
        triggerShake(formatLoginError("MFA_REQUIRED"));
        router.push("/sysadmin/security");
        return;
      }

      // Password leg ok — server issued an MFA challenge, prompt for TOTP
      if (!result.success && result.mfaRequired && result.mfaChallenge) {
        setMfaChallenge(result.mfaChallenge);
        triggerShake("Enter the 6-digit code from your authenticator app.");
        return;
      }

      if (result.success) {
        setMfaChallenge(null);
        setTotpCode("");
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
              placeholder="Enter ID"
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
              placeholder="password or PIN"
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

        {mfaChallenge && (
          <div className="space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-sky-400">
                Authenticator Code (2FA)
              </label>
              <button
                type="button"
                onClick={() => {
                  setMfaChallenge(null);
                  setTotpCode("");
                }}
                className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Back to Password
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-base)] border border-sky-500/50 text-sm font-mono tracking-widest text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-sky-400 outline-none transition-all"
              />
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-sky-400" />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !loginIdentifier || !passwordOrPin || (!!mfaChallenge && totpCode.length < 6)}
          className="w-full touch-target-primary rounded-xl bg-[var(--action-primary)] text-white font-bold text-sm hover:opacity-95 transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2 py-3 mt-2 active:scale-[0.99]"
        >
          {loading ? (
            <span>Authenticating...</span>
          ) : mfaChallenge ? (
            <>
              <span>Verify Code & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
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
