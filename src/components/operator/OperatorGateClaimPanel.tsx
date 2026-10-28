"use client";

import { useCallback, useState } from "react";
import {
  KeyRound,
  Loader2,
  CheckCircle2,
  MapPin,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { normalizeClaimCode } from "@/lib/claim-codes";

interface GateClaimResult {
  gateId: string;
  gateName: string;
}

/**
 * Operator "Register at kiosk" panel.
 *
 * Shown to an operator who has NO assigned gate (at the kiosk, or on the
 * operator console). It walks them through the steps and captures the gate-
 * claim code a supervisor generated for them:
 *
 *   1. Your supervisor gives you a gate-claim code (a string, not just a number)
 *   2. Enter that code below
 *   3. Your gate is assigned and you can start scanning
 *
 * On success it updates the in-memory auth store (gateId) and redirects to the
 * freshly-assigned gate. The claim endpoint is one-use; replaying a code
 * fails with CLAIM_CODE_INVALID.
 */
export function OperatorGateClaimPanel() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GateClaimResult | null>(null);

  const claim = useCallback(
    async (raw: string) => {
      const normalized = normalizeClaimCode(raw);
      if (!normalized) {
        setError("Enter the code your supervisor gave you.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/operator/claim-gate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify({ code: normalized }),
        });
        const body = await res.json();
        if (body?.success) {
          setResult({ gateId: body.data.gateId, gateName: body.data.gateName });
          // Refresh the in-memory user so the rest of the app sees the gate.
          if (user) setUser({ ...user, gateId: body.data.gateId });
        } else {
          setError(body?.error?.message || "Claim failed. Try a different code.");
        }
      } catch {
        setError("Could not reach the server. Check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [token, user, setUser]
  );

  if (result) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">Gate Assigned</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            You are now assigned to <span className="font-semibold text-emerald-400">{result.gateName}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/gate/${result.gateId}`)}
          className="px-4 py-2 rounded-xl bg-[var(--action-primary)] text-slate-950 text-xs font-bold hover:brightness-110 transition flex items-center justify-center gap-2 mx-auto"
        >
          <MapPin className="w-4 h-4" /> Go to {result.gateName}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">Register at this kiosk</h3>
          <p className="text-[11px] text-[var(--text-secondary)]">
            No gate assigned yet — enter the claim code your supervisor gave you.
          </p>
        </div>
      </div>

      <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
        <li className="flex gap-2.5 items-start">
          <span className="w-5 h-5 rounded-full bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-200 mt-0.5">1</span>
          <span>Your supervisor generates a <span className="font-semibold text-[var(--text-primary)]">6-digit gate-claim code</span> and hands it to you (a short string you can read aloud, like an OTP).</span>
        </li>
        <li className="flex gap-2.5 items-start">
          <span className="w-5 h-5 rounded-full bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-200 mt-0.5">2</span>
          <span>Enter that code in the box below.</span>
        </li>
        <li className="flex gap-2.5 items-start">
          <span className="w-5 h-5 rounded-full bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-200 mt-0.5">3</span>
          <span>Your gate is assigned and you can begin scanning.</span>
        </li>
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          claim(code);
        }}
        className="space-y-3"
      >
        <div className="relative">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6).toUpperCase());
              if (error) setError(null);
            }}
            placeholder="6-digit code, e.g. 482913"
            aria-label="Gate claim code"
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] font-mono text-sm tracking-[0.2em] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:tracking-normal focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
          />
          <ShieldCheck className="w-4 h-4 absolute right-3.5 top-3.5 text-[var(--text-muted)]" />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-medium">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="w-full py-3 px-4 rounded-xl bg-[var(--action-primary)] hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {submitting ? "Assigning…" : "Assign My Gate"}
        </button>
      </form>

      <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        No code yet? Ask your supervisor to generate one from Supervisor → Gates → Gate Claim Codes.
      </p>
    </div>
  );
}
