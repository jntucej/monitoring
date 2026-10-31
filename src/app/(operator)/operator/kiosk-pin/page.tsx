"use client";

import { useState } from "react";
import { Loader2, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuthStore, tokenStorage } from "@/stores/authStore";

/**
 * Kiosk PIN entry for unattended operator terminals.
 *
 * POSTs { pin } to /api/operator/kiosk-session, which mints an operator-scoped
 * session for the designated kiosk default operator (modes: TRUSTED_IP,
 * PIN_REQUIRED, or open-non-prod). On success we install the returned tokens
 * into the auth store and drop the operator into their desk. The response's
 * `noGate` flag tells us whether the freshly minted operator has a gate yet —
 * if so we send them to the claim page instead of the scan desk.
 */
export default function OperatorKioskPinPage() {
  const user = useAuthStore((s) => s.user);
  const setRole = useAuthStore((s) => s.setRole);
  const checkSession = useAuthStore((s) => s.checkSession);

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    const trimmed = pin.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/operator/kiosk-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.success) {
        // Install the freshly minted kiosk session into the auth store so the
        // whole operator app (gate desk, scans, claims) runs on these tokens.
        tokenStorage.set({
          token: body.data.accessToken,
          refreshToken: body.data.refreshToken,
        });
        setSuccess(true);
        // Hydrate the user row for the minted subject, then route to their
        // desk — or to the claim page if no gate is bound yet.
        await checkSession();
        setRole("operator");
        const target =
          body.data.noGate || !body.data.gateId ? "/operator/claim" : `/gate/${body.data.gateId}`;
        window.location.replace(target);
        return;
      }
      const errCode = body?.error?.code;
      if (errCode === "PIN_INVALID") {
        setError("PIN is incorrect. Please retry.");
      } else if (errCode === "PIN_REQUIRED" || errCode === "KIOSK_OPEN_REFUSED") {
        setError(
          "This terminal needs a kiosk operator PIN. Ask your supervisor to set KIOSK_SESSION_REQUIRE_PIN."
        );
      } else if (errCode === "KIOSK_IP_NOT_TRUSTED") {
        setError("This terminal is not in the trusted kiosk IP list.");
      } else if (errCode === "KIOSK_MISCONFIGURED") {
        setError(body?.error?.message || "Kiosk operator is not configured.");
      } else if (errCode === "ACCOUNT_INACTIVE") {
        setError("The kiosk operator account is not active.");
      } else {
        setError(body?.error?.message || "Could not start the kiosk session.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            Kiosk PIN
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Enter the operator PIN for this terminal to start a kiosk session.
            {user?.gateId
              ? " You already have a gate assigned and can proceed to the desk after sign-in."
              : " If no gate is bound yet, you&apos;ll be sent to claim one."}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4">
          <label className="block">
            <span className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">
              Operator PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="••••••"
              className="w-full px-4 py-3 rounded-lg bg-[#0b1220] border border-slate-700 text-2xl font-mono tracking-[0.3em] text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/40 outline-none"
              disabled={submitting}
            />
          </label>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && !error && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Kiosk session started. Taking you to your desk…
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || pin.length === 0}
            className="w-full min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting session…
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Sign in to kiosk
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
