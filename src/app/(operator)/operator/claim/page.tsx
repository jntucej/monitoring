"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

/**
 * Operator claim page — redeem a 6-digit claim code minted by a supervisor
 * at /api/supervisor/claim-codes, which binds the operator to that gate.
 *
 * Flow: operator lands here (from the /operator desk when they have no gate
 * assigned), enters the code, POSTs { code } to /api/operator/claim-gate.
 * On success the operator's users.gate_id is bound and the auth cache is
 * evicted server-side; we refresh the user row and route them to the gate
 * desk. If they already have a gate assigned the API returns ALREADY_ASSIGNED
 * — we show that and link back to their desk instead of claiming again.
 */
export default function OperatorClaimPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const checkSession = useAuthStore((s) => s.checkSession);
  const setRole = useAuthStore((s) => s.setRole);

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedGateName, setClaimedGateName] = useState<string | null>(null);

  const authHeaders = {
    Authorization: `Bearer ${token ?? ""}`,
    "Content-Type": "application/json",
  };

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/claim-gate", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ code: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.success) {
        setClaimedGateName(body?.data?.gateName ?? null);
        // Re-hydrate the user row so the desk shows the freshly bound gate.
        await checkSession();
        setRole("operator");
        // Route to the gate desk for the freshly claimed gate.
        if (body?.data?.gateId) {
          router.push(`/gate/${body.data.gateId}`);
          return;
        }
        router.push("/operator");
        return;
      }
      const errCode = body?.error?.code;
      if (errCode === "ALREADY_ASSIGNED") {
        setError(
          body?.error?.message ||
            "You already have a gate assigned. Open your desk instead of claiming a new one."
        );
      } else if (errCode === "CODE_REQUIRED") {
        setError("Enter the 6-digit claim code your supervisor gave you.");
      } else {
        setError(body?.error?.message || "Claim failed. Check the code and try again.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-action-success" />
            Claim your gate
          </h1>
          <p className="text-xs text-text-muted mt-1.5">
            Enter the 6-digit code a supervisor generated for you. It&apos;s one-time
            use and binds you to that gate. You can only claim if you don&apos;t already
            have a gate assigned.
          </p>
        </div>

        <div className="surface-card bg-bg-surface p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
              Claim code
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="e.g. 482913"
              className="surface-card w-full px-4 py-3 bg-bg-base text-2xl font-mono tracking-[0.3em] text-text-primary placeholder:text-text-muted placeholder:text-base placeholder:tracking-normal placeholder:font-sans focus:ring-2 focus:ring-emerald-500/40 outline-none"
              disabled={submitting}
            />
          </label>

          {error && (
            <div className="surface-card p-2.5 bg-rose-500/10 text-action-danger text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {error}{" "}
                {user?.gateId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/gate/${user.gateId}`)}
                    className="underline underline-offset-2 hover:text-rose-200"
                  >
                    Open your current gate
                  </button>
                )}
              </span>
            </div>
          )}

          {claimedGateName && !error && (
            <div className="surface-card p-2.5 bg-emerald-500/10 text-action-success text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Gate claimed ({claimedGateName}). Routing to your desk…
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || code.length < 4}
            className="w-full min-h11 rounded-lg bg-action-success hover:bg-action-success disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Claiming…
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Claim gate
              </>
            )}
          </button>

          {user?.gateId && (
            <p className="text-xs text-text-muted text-center">
              You already have gate <span className="font-mono text-text-secondary">{user.gateId}</span>{" "}
              assigned. Use the link above to return to your desk.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
