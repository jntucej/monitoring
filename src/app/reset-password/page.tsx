"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

type ResetState = "idle" | "submitting" | "success" | "error";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<ResetState>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (password.length < 6) {
        setError("New password must be at least 6 characters long.");
        setState("error");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        setState("error");
        return;
      }

      setState("submitting");
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          const msg = json?.error?.message ?? "This reset link is invalid or has expired. Request a new one.";
          setError(msg);
          setState("error");
          return;
        }
        setError(null);
        setState("success");
      } catch {
        setError("Network error — please retry.");
        setState("error");
      }
    },
    [token, password, confirm]
  );

  if (state === "success") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--bg-surface)]/80 border border-[var(--border)] p-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Password updated</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--bg-surface)]/80 border border-[var(--border)] p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Set a new password</h1>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {token
            ? "Enter your new password below. This link is one-time and expires in 1 hour."
            : "No reset link detected in the URL. Please use the link your administrator sent you."}
        </p>

        {!token ? (
          <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
            This page requires a valid <code>?token=</code> parameter from a reset link.
            <div className="mt-2">
              <Link href="/login" className="text-[var(--action-primary)] underline">
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="new-password" className="text-xs font-medium text-[var(--text-muted)]">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 pl-9 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
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

            <div className="space-y-1">
              <label htmlFor="confirm-password" className="text-xs font-medium text-[var(--text-muted)]">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 pl-9 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
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

            <button
              type="submit"
              disabled={state === "submitting" || !token}
              className="w-full rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {state === "submitting" ? "Saving…" : "Update password"}
            </button>

            <p className="text-center text-xs text-[var(--text-muted)]">
              <Link href="/login" className="text-[var(--action-primary)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
