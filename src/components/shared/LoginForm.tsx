"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  UserCheck,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { getDefaultRouteForRole } from "@/lib/route-helpers";

interface LoginFormProps {
  title: string;
  subtitle: string;
}

function formatLoginError(code?: string, defaultMsg?: string): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Invalid username or password. Please try again.";
    case "ACCOUNT_LOCKED":
      return "Account locked after too many failed attempts. Try again in 15 minutes.";
    case "ACCOUNT_SUSPENDED":
      return "This account is suspended. Contact your administrator.";
    case "RATE_LIMITED":
      return "Too many login attempts. Please wait a minute and retry.";
    case "NETWORK_ERROR":
      return "Could not reach the server. Check your connection.";
    default:
      return defaultMsg || "Login failed. Please try again.";
  }
}

export function LoginForm({ title, subtitle }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Local form state (NOT tied to store.loading — that's the bug) ───────
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false); // unchecked by default
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetFlow, setShowResetFlow] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Store selectors — read `authenticated` and `role`, NOT `loading`.
  const login = useAuthStore((s) => s.login);
  const authenticated = useAuthStore((s) => s.authenticated);
  const role = useAuthStore((s) => s.role);
  const hasHydrated = useHasHydrated();

  // Track whether this mount should be allowed to redirect away from /login.
  // Two conditions, both required:
  //   1. `sessionValid` — the persisted session was re-verified server-side via
  //      /api/auth/session. Without this check, a user who landed on /login
  //      holding a STALE client-side `authenticated` flag (from localStorage,
  //      or a token that's about to expire on the server) gets instantly
  //      router.replace()'d to their default route on mount. That route's
  //      AuthGuard then calls checkSession(), the server 401s, the guard
  //      bounces back to /login, and this effect fires again — Chrome's
  //      "additional client-side redirect" loop.
  //   2. `role` is present (a real login or a verified session, not a stale
  //      flag that failed re-verification).
  const [sessionValid, setSessionValid] = useState(false);

  // ── Verify a rehydrated session exactly once on mount ────────────────────
  // Runs before the redirect effect below can act, so by the time
  // `sessionValid` flips, we KNOW the server actually accepts this session.
  useEffect(() => {
    const t = useAuthStore.getState();
    if (!t.authenticated || !t.role) return; // nothing to verify
    t.checkSession().then((ok) => setSessionValid(ok));
  }, []);

  // ── Post-auth redirect: only after the session was verified server-side ──
  useEffect(() => {
    if (!sessionValid || !role) return;
    const redirect = searchParams?.get("redirect");
    const target =
      redirect && redirect.startsWith("/")
        ? redirect
        : getDefaultRouteForRole(role as Role);
    router.replace(target);
  }, [sessionValid, role, router, searchParams]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Client-side validation
      const id = loginIdentifier.trim();
      if (!id) {
        setError("Please enter your username or roll number.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }

      setSubmitting(true);
      try {
        const result = await login(id, password);
        if (result.success) {
          // A successful login IS a verified session — allow the redirect.
          setSessionValid(true);
        } else {
          setError(formatLoginError(result.code, result.error));
        }
      } catch {
        setError(formatLoginError("NETWORK_ERROR"));
      } finally {
        setSubmitting(false);
      }
    },
    [loginIdentifier, password, login]
  );

  // ── Forgot-password flow ──────────────────────────────────────────────────
  const handlePasswordReset = useCallback(async () => {
    if (!resetEmail.trim()) {
      setError("Enter the email address on your account.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
        credentials: "include",
      });
      if (res.ok) {
        setResetSent(true);
        setError(null);
      } else {
        setError("Could not send reset link. Try again.");
      }
    } catch {
      setError("Could not send reset link. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }, [resetEmail]);

  const disabled = submitting || !loginIdentifier.trim() || !password;

  // ── Reset-flow subview ────────────────────────────────────────────────────
  if (showResetFlow) {
    return (
      <div className="w-full max-w-sm space-y-5">
        <button
          type="button"
          onClick={() => {
            setShowResetFlow(false);
            setResetSent(false);
            setError(null);
          }}
          className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" /> Back to sign in
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Reset password</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            We&apos;ll email you a one-time link.
          </p>
        </div>
        {resetSent ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            If that email exists, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="you@college.edu"
              autoComplete="email"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={submitting || !resetEmail.trim()}
              className="w-full rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Login view ────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleFormSubmit}
        action="/api/auth/login"
        method="POST"
        autoComplete="off"
        noValidate
        className="space-y-4"
      >
        <div className="space-y-1">
          <label htmlFor="identifier" className="text-xs font-medium text-[var(--text-muted)]">
            Username / Roll number
          </label>
          <div className="relative">
            <input
              id="identifier"
              name="login"
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="characters"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 pl-10 text-sm text-[var(--text-primary)]"
            />
            <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-xs font-medium text-[var(--text-muted)]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 pl-10 pr-10 text-sm text-[var(--text-primary)]"
            />
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[var(--border)]"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setShowResetFlow(true)}
            className="text-xs text-[var(--action-primary)] hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign In"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Need help?{" "}
        <Link href="/help" prefetch={false} className="text-[var(--action-primary)] hover:underline">
          Contact your administrator
        </Link>
      </p>
    </div>
  );
}
