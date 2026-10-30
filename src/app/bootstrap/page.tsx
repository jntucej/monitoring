"use client";

import Link from "next/link";
import { Suspense, useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Lock, User, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";

type BootstrapState = "idle" | "submitting" | "success" | "error";

function BootstrapPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const urlCode = (params?.get("code") ?? "").trim().toUpperCase();

  const [uniqueId, setUniqueId] = useState("");
  const [code, setCode] = useState(urlCode);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<BootstrapState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlCode && !code) {
      setCode(urlCode);
    }
  }, [urlCode, code]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const cleanId = uniqueId.trim().toUpperCase();
      const cleanCode = code.trim().toUpperCase();

      if (!cleanId) {
        setError("Please enter your ID or Roll Number.");
        setState("error");
        return;
      }

      if (!cleanCode) {
        setError("Please enter the activation code given by your administrator.");
        setState("error");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        setState("error");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        setState("error");
        return;
      }

      setState("submitting");

      try {
        const res = await fetch("/api/auth/bootstrap", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uniqueId: cleanId,
            code: cleanCode,
            newPassword: password,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          const errCode = json?.error?.code ?? "UNKNOWN";
          const msg =
            json?.error?.message ??
            (errCode === "ALREADY_ONBOARDED"
              ? "This account has already completed setup. You can log in directly."
              : "Invalid activation code or ID. Check your details and try again.");
          setError(msg);
          setState("error");
          return;
        }

        setState("success");
        setTimeout(() => router.replace("/login"), 1400);
      } catch {
        setError("Network connection error. Please try again.");
        setState("error");
      }
    },
    [code, confirmPassword, password, router, uniqueId]
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8 relative overflow-x-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Activate Your Account</h1>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Enter your university ID and the one-time activation code from your administrator to set your password.
          </p>
        </div>

        <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] p-6 sm:p-8 space-y-5 shadow-2xl">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {state === "success" && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Account activated successfully! Redirecting to login…</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Unique ID / Roll */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block" htmlFor="uniqueId">
                ID / Roll Number *
              </label>
              <div className="relative">
                <input
                  id="uniqueId"
                  type="text"
                  value={uniqueId}
                  onChange={(e) => setUniqueId(e.target.value)}
                  placeholder="e.g. 24JJ1A0501 or EMP-001"
                  required
                  autoCapitalize="characters"
                  className="w-full rounded-xl bg-[var(--bg-base)] border border-[var(--border)] px-3.5 py-2.5 pl-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Activation Code */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block" htmlFor="code">
                  Activation Code *
                </label>
                {urlCode && (
                  <span className="text-[10px] text-emerald-400 font-medium">Pre-filled from link</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCD1234"
                  required
                  maxLength={12}
                  className="w-full rounded-xl bg-[var(--bg-base)] border border-[var(--border)] px-3.5 py-2.5 pl-10 text-sm font-mono tracking-widest text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-emerald-500 font-bold uppercase"
                />
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block" htmlFor="password">
                New Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl bg-[var(--bg-base)] border border-[var(--border)] px-3.5 py-2.5 pl-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide block" htmlFor="confirmPassword">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Re-enter your password"
                  className="w-full rounded-xl bg-[var(--bg-base)] border border-[var(--border)] px-3.5 py-2.5 pl-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={state === "submitting" || state === "success"}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50 py-3 flex items-center justify-center gap-2 active:scale-95 shadow-md mt-2"
            >
              {state === "submitting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating Account…</span>
                </>
              ) : (
                <>
                  <span>Activate Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border)] text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Already activated your account?{" "}
              <Link href="/login" className="text-emerald-400 hover:underline font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BootstrapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center text-[var(--text-muted)] text-xs">
          Loading…
        </div>
      }
    >
      <BootstrapPageInner />
    </Suspense>
  );
}
