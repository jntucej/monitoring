export const dynamic = "force-dynamic";
"use client";

import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BootstrapState = "idle" | "submitting" | "success" | "error";

function BootstrapPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = (params.get("code") ?? "").trim().toUpperCase();

  const [uniqueId, setUniqueId] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [state, setState] = useState<BootstrapState>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!uniqueId.trim() || !code || password.length < 8 || !/^\d{4,8}$/.test(pin)) {
        setError(
          "Provide your ID (roll), 8+ char password, and a 4-8 digit PIN. The activation code from your admin is pre-filled — if it's missing, ask your admin for the /bootstrap?code=... link."
        );
        setState("error");
        return;
      }
      setState("submitting");
      setError(null);
      try {
        const res = await fetch("/api/auth/bootstrap", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uniqueId: uniqueId.trim(),
            code,
            newPassword: password,
            newPin: pin,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          const code = json?.error?.code ?? "UNKNOWN";
          const msg =
            json?.error?.message ??
            (code === "ALREADY_ONBOARDED"
              ? "This account has already completed setup."
              : "Bootstrap failed. Check your code and try again.");
          setError(msg);
          setState("error");
          return;
        }
        setState("success");
        // A short beat so the success state is visible, then redirect.
        setTimeout(() => router.replace("/login"), 1200);
      } catch {
        setError("Network error — please retry.");
        setState("error");
      }
    },
    [code, pin, router, uniqueId, password]
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8 relative overflow-x-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Activate your account</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Use the one-time setup code your admin shared with you to set a
            password and PIN, then log in as usual.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--bg-surface)]/80 border border-[var(--border)] p-5 space-y-4">
          {code ? (
            <div className="text-[11px] text-[var(--text-muted)]">
              Activation code: <span className="font-mono text-emerald-400 font-bold">{code}</span>
            </div>
          ) : (
            <div className="text-[11px] text-amber-400">
              No <code>?code=</code> in the URL. Ask your admin for the full link
              (it includes the one-time setup code).
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Your ID / Roll
              </span>
              <input
                type="text"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                placeholder="e.g. 21011A0501"
                required
                className="mt-1 w-full rounded-lg bg-[var(--bg-base)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                New password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="mt-1 w-full rounded-lg bg-[var(--bg-base)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                New PIN
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,8}"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                minLength={4}
                maxLength={8}
                placeholder="4–8 digits"
                className="mt-1 w-full rounded-lg bg-[var(--bg-base)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </label>

            {state === "error" && error && (
              <p className="text-[11px] text-rose-400 font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={state === "submitting"}
              className="w-full rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-2.5"
            >
              {state === "submitting" ? "Activating…" : "Activate account"}
            </button>
          </form>

          {state === "success" && (
            <p className="text-[12px] font-semibold text-emerald-400 text-center">
              Done. Redirecting to login…
            </p>
          )}

          <p className="text-[11px] text-center text-[var(--text-muted)]">
            Already activated?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Go to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BootstrapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)] text-xs">
          Loading…
        </div>
      }
    >
      <BootstrapPageInner />
    </Suspense>
  );
}
